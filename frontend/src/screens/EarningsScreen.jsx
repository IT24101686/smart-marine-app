import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    TextInput,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import client from '../api/client';

const { width } = Dimensions.get('window');

const EarningsScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('received'); // 'received' or 'to_pay'
    const [loading, setLoading] = useState(true);
    const [payouts, setPayouts] = useState([]);
    const [summary, setSummary] = useState({ totalEarned: 0, pendingEarned: 0, totalToPay: 0 });
    const [currentUser, setCurrentUser] = useState(null);

    // ── Manual Payout Modal States ──────────────────────────
    const [modalVisible, setModalVisible] = useState(false);
    const [manualAmount, setManualAmount] = useState('');
    const [manualType, setManualType] = useState('salary');
    const [manualNotes, setManualNotes] = useState('');
    const [manualReceiverId, setManualReceiverId] = useState(''); // Simple ID input for now
    const [creating, setCreating] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadPayouts();
        }, [activeTab])
    );

    const loadPayouts = async () => {
        setLoading(true);
        try {
            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) return;
            const user = JSON.parse(userDataStr);
            setCurrentUser(user);

            const res = await client.get('/api/payouts');
            const allPayouts = res.data;
            
            if (activeTab === 'received') {
                const received = allPayouts.filter(p => (p.receiverId?._id || p.receiverId) === user._id);
                setPayouts(received);
            } else {
                const toPay = allPayouts.filter(p => (p.payerId?._id || p.payerId) === user._id);
                setPayouts(toPay);
            }

            // Calculate summary
            let earned = 0, pEarned = 0, tPay = 0;
            allPayouts.forEach(p => {
                const isMeReceiver = (p.receiverId?._id || p.receiverId) === user._id;
                const isMePayer = (p.payerId?._id || p.payerId) === user._id;
                
                if (isMeReceiver) {
                    if (p.status === 'completed') earned += p.amount;
                    else if (p.status !== 'canceled') pEarned += p.amount;
                }
                if (isMePayer && p.status === 'pending') {
                    tPay += p.amount;
                }
            });
            setSummary({ totalEarned: earned, pendingEarned: pEarned, totalToPay: tPay });

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load payouts");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateManualPayout = async () => {
        if (!manualAmount || !manualReceiverId) {
            Alert.alert("Error", "Amount and Receiver ID are required");
            return;
        }
        setCreating(true);
        try {
            await client.post('/api/payouts', {
                receiverId: manualReceiverId,
                amount: parseFloat(manualAmount),
                type: manualType,
                notes: manualNotes,
                role: 'crew' // Default for manual
            });
            Alert.alert("Success", "Manual payout record created!");
            setModalVisible(false);
            resetForm();
            loadPayouts();
        } catch (error) {
            Alert.alert("Error", "Failed to create record. Make sure the Receiver ID is correct.");
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setManualAmount('');
        setManualNotes('');
        setManualReceiverId('');
        setManualType('salary');
    };

    const handleDeletePayout = (id) => {
        Alert.alert(
            "Delete Record",
            "Are you sure you want to remove this financial record?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.delete(`/api/payouts/${id}`);
                            loadPayouts();
                        } catch (error) {
                            Alert.alert("Error", "Could not delete record");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleConfirmPayment = async (payoutId) => {
        Alert.alert(
            "Confirm Receipt",
            "Did you receive this payment in full?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Received", 
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.put(`/api/payouts/${payoutId}/confirm`);
                            Alert.alert("Success", "Payment confirmed as received.");
                            loadPayouts();
                        } catch (error) {
                            Alert.alert("Error", "Failed to confirm payment");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleMarkAsPaid = async (payoutId) => {
        Alert.alert(
            "Mark as Paid",
            "Have you already sent this payment to the receiver?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Yes, Paid", 
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await client.put(`/api/payouts/${payoutId}/pay`);
                            Alert.alert("Success", "Payment marked as paid. Waiting for receiver's confirmation.");
                            loadPayouts();
                        } catch (error) {
                            Alert.alert("Error", "Failed to update payment status");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderPayoutCard = ({ item }) => {
        const isReceived = activeTab === 'received';
        const statusColors = {
            pending: { text: '#f59e0b', bg: '#fef3c7', icon: 'time' },
            paid: { text: '#3b82f6', bg: '#eff6ff', icon: 'checkmark-circle' },
            completed: { text: '#10b981', bg: '#ecfdf5', icon: 'cash' },
            canceled: { text: '#ef4444', bg: '#fef2f2', icon: 'close-circle' }
        };
        const st = statusColors[item.status] || statusColors.pending;

        return (
            <View style={styles.payoutCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: st.bg }]}>
                        <Ionicons name={st.icon} size={24} color={st.text} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.payoutType}>{item.type.toUpperCase()}</Text>
                        <Text style={styles.payoutDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.amountText}>LKR {item.amount.toLocaleString()}</Text>
                        {!isReceived && item.status === 'pending' && (
                            <TouchableOpacity onPress={() => handleDeletePayout(item._id)}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" style={{ marginTop: 5 }} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                    <View style={styles.userInfo}>
                        <Text style={styles.userLabel}>{isReceived ? 'From:' : 'To:'}</Text>
                        <Text style={styles.userName}>{isReceived ? (item.payerId?.name || 'Planner') : (item.receiverId?.name || 'User')}</Text>
                    </View>
                    
                    {isReceived && item.status === 'paid' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleConfirmPayment(item._id)}>
                            <Text style={styles.actionBtnText}>Confirm Received</Text>
                        </TouchableOpacity>
                    )}

                    {!isReceived && item.status === 'pending' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0f172a' }]} onPress={() => handleMarkAsPaid(item._id)}>
                            <Text style={styles.actionBtnText}>Mark as Paid</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'completed' && (
                        <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-done" size={16} color="#10b981" />
                            <Text style={styles.completedText}>Settled</Text>
                        </View>
                    )}
                    
                    {item.status === 'pending' && isReceived && (
                        <Text style={styles.waitingText}>Waiting for payment...</Text>
                    )}
                    
                    {item.status === 'paid' && !isReceived && (
                        <Text style={styles.waitingText}>Waiting for confirmation...</Text>
                    )}
                </View>
                {item.notes && (
                    <Text style={styles.notesText}>📝 {item.notes}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Finance</Text>
                        </View>
                        {(currentUser?.role === 'trip_planner' || currentUser?.role === 'boat_owner') && (
                            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                                <Ionicons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Earned</Text>
                            <Text style={styles.summaryValue}>LKR {summary.totalEarned.toLocaleString()}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Pending</Text>
                            <Text style={[styles.summaryValue, { color: '#fbbf24' }]}>LKR {summary.pendingEarned.toLocaleString()}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.tabBar}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'received' && styles.activeTab]} 
                    onPress={() => setActiveTab('received')}
                >
                    <Ionicons name="wallet-outline" size={18} color={activeTab === 'received' ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>My Earnings</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'to_pay' && styles.activeTab]} 
                    onPress={() => setActiveTab('to_pay')}
                >
                    <Ionicons name="paper-plane-outline" size={18} color={activeTab === 'to_pay' ? '#2563eb' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'to_pay' && styles.activeTabText]}>To Pay</Text>
                    {summary.totalToPay > 0 && <View style={styles.notifBadge} />}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={payouts}
                    renderItem={renderPayoutCard}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="cash-outline" size={60} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No records found</Text>
                            <Text style={styles.emptySub}>Financial transactions will appear here.</Text>
                        </View>
                    }
                />
            )}

            {/* ── MANUAL PAYOUT MODAL ── */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manual Payout Entry</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Receiver User ID</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Paste Receiver ID here" 
                                value={manualReceiverId}
                                onChangeText={setManualReceiverId}
                            />

                            <Text style={styles.label}>Amount (LKR)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. 5000" 
                                keyboardType="numeric"
                                value={manualAmount}
                                onChangeText={setManualAmount}
                            />

                            <Text style={styles.label}>Payout Type</Text>
                            <View style={styles.typeRow}>
                                {['salary', 'rental', 'commission', 'share'].map(t => (
                                    <TouchableOpacity 
                                        key={t} 
                                        style={[styles.typeBtn, manualType === t && styles.activeType]}
                                        onPress={() => setManualType(t)}
                                    >
                                        <Text style={[styles.typeText, manualType === t && styles.activeTypeText]}>{t.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Notes</Text>
                            <TextInput 
                                style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                                placeholder="Description (optional)" 
                                multiline
                                value={manualNotes}
                                onChangeText={setManualNotes}
                            />

                            <TouchableOpacity 
                                style={[styles.saveBtn, creating && { opacity: 0.7 }]} 
                                onPress={handleCreateManualPayout}
                                disabled={creating}
                            >
                                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Financial Record</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
    summaryContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', margin: 20, borderRadius: 20, padding: 20, alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
    summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    summaryValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: -15, borderRadius: 16, padding: 6, elevation: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
    activeTab: { backgroundColor: '#eff6ff' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    activeTabText: { color: '#2563eb' },
    notifBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', position: 'absolute', top: 12, right: 30 },
    listContent: { padding: 20 },
    payoutCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1, marginLeft: 12 },
    payoutType: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 0.5 },
    payoutDate: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
    amountText: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userInfo: { flex: 1 },
    userLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
    userName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    actionBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    completedText: { color: '#10b981', fontSize: 12, fontWeight: '800' },
    waitingText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: '600' },
    notesText: { fontSize: 12, color: '#64748b', marginTop: 10, fontStyle: 'italic', backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginTop: 15 },
    emptySub: { fontSize: 14, color: '#64748b', marginTop: 5 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 30, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    label: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 15 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b', fontWeight: '600' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
    typeBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    activeType: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    typeText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
    activeTypeText: { color: '#fff' },
    saveBtn: { backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 30 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' }
});

export default EarningsScreen;
