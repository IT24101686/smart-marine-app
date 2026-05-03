import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    Alert,
    Dimensions,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const { width } = Dimensions.get('window');

const TripSummaryScreen = ({ route, navigation }) => {
    const { tripId } = route.params;
    const [summary, setSummary] = useState(null);
    const [finances, setFinances] = useState(null);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState([]); // Array of { fishType, priceA, priceB }
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

    const fetchFinances = async () => {
        const financeRes = await client.get(`/api/trips/${tripId}/finances`);
        setFinances(financeRes.data);
    };

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                const summaryRes = await client.get(`/api/trips/${tripId}/summary`);
                setSummary(summaryRes.data);
                
                // Load trip details to get existing custom prices
                const tripDetailsRes = await client.get(`/api/trips/${tripId}`);
                const tripData = tripDetailsRes.data;
                
                // Initialize prices from trip data or summary breakdown
                if (tripData.customPrices && tripData.customPrices.length > 0) {
                    setPrices(tripData.customPrices);
                } else {
                    const initialPrices = Object.keys(summaryRes.data.catchBreakdownDetails || {}).map(type => ({
                        fishType: type,
                        priceA: 1500,
                        priceB: 1000
                    }));
                    setPrices(initialPrices);
                }

                await fetchFinances();
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [tripId]);

    const handleCancelTrip = async () => {
        Alert.alert(
            "Cancel Trip",
            "Are you sure you want to cancel this planned trip? This action cannot be undone.",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel Trip", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.delete(`/api/trips/${tripId}`);
                            Alert.alert("Success", "Trip cancelled");
                            navigation.navigate('Home');
                        } catch (error) {
                            Alert.alert("Error", "Failed to cancel trip");
                        }
                    }
                }
            ]
        );
    };

    const handleRemoveCrew = async (userId, name) => {
        Alert.alert(
            "Remove Crew Member",
            `Are you sure you want to remove ${name} from this trip?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Remove", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.delete(`/api/trips/${tripId}/crew/${userId}`);
                            Alert.alert("Success", "Crew member removed");
                            const summaryRes = await client.get(`/api/trips/${tripId}/summary`);
                            setSummary(summaryRes.data);
                        } catch (error) {
                            Alert.alert("Error", "Failed to remove crew member");
                        }
                    }
                }
            ]
        );
    };

    const renderCrewManagement = () => {
        if (summary?.status !== 'planned') return null;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={24} color="#2563eb" />
                    <Text style={styles.sectionTitle}>Crew Management</Text>
                </View>
                {summary.crew?.map((member) => (
                    <View key={member._id} style={styles.crewMemberRow}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <TouchableOpacity 
                            style={styles.removeBtn} 
                            onPress={() => handleRemoveCrew(member._id, member.name)}
                        >
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                ))}
                {summary.crew?.length === 0 && <Text style={styles.emptyText}>No crew members yet.</Text>}
            </View>
        );
    };

    const handleSellGradeC = () => {
        Alert.prompt(
            "Sell Grade C Stock",
            "Enter total revenue received from dry fish/industrial buyers (LKR):",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Record Sale",
                    onPress: async (revenue) => {
                        try {
                            await client.post(`/api/trips/${tripId}/sell-grade-c`, { revenue: parseFloat(revenue) });
                            Alert.alert("Success", "Grade C sale recorded!");
                            fetchFinances(); // Refresh financials
                        } catch (error) {
                            Alert.alert("Error", "Failed to record sale");
                        }
                    }
                }
            ],
            "plain-text",
            "5000"
        );
    };


    const handleUpdatePrice = (fishType, field, value) => {
        setPrices(prev => prev.map(p => 
            p.fishType === fishType ? { ...p, [field]: parseFloat(value) || 0 } : p
        ));
    };

    const savePrices = async () => {
        try {
            setIsUpdatingPrices(true);
            await client.put(`/api/trips/${tripId}/prices`, { customPrices: prices });
            Alert.alert("Success", "Asking prices set for this trip!");
        } catch (error) {
            Alert.alert("Error", "Failed to save prices");
        } finally {
            setIsUpdatingPrices(false);
        }
    };

    const renderPriceSettings = () => {
        if (summary?.status !== 'completed') return null;

        return (
            <View style={[styles.section, { borderColor: '#2563eb', borderHalfWidth: 2 }]}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="pricetags" size={20} color="#2563eb" />
                    </View>
                    <View>
                        <Text style={[styles.sectionTitle, { color: '#1e3a8a' }]}>Set Wholesale Prices 🏷️</Text>
                        <Text style={styles.sectionSub}>Decide your selling price for District Buyers</Text>
                    </View>
                </View>

                {prices.length > 0 ? prices.map((p, idx) => (
                    <View key={idx} style={styles.priceSettingCard}>
                        <View style={styles.priceCardHeader}>
                            <Text style={styles.fishTypeName}>{p.fishType}</Text>
                            <View style={styles.activeTag}>
                                <Text style={styles.activeTagText}>Editing</Text>
                            </View>
                        </View>
                        <View style={styles.priceRowInputs}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Grade A (රු./kg)</Text>
                                <TextInput 
                                    style={styles.priceInput}
                                    keyboardType="numeric"
                                    value={p.priceA.toString()}
                                    onChangeText={(val) => handleUpdatePrice(p.fishType, 'priceA', val)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Grade B (රු./kg)</Text>
                                <TextInput 
                                    style={styles.priceInput}
                                    keyboardType="numeric"
                                    value={p.priceB.toString()}
                                    onChangeText={(val) => handleUpdatePrice(p.fishType, 'priceB', val)}
                                />
                            </View>
                        </View>
                    </View>
                )) : (
                    <View style={styles.noCatchBox}>
                        <Text style={styles.noCatchText}>Processing catch breakdown... Please wait.</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.savePricesBtn, isUpdatingPrices && { opacity: 0.7 }]} 
                    onPress={savePrices}
                    disabled={isUpdatingPrices}
                >
                    {isUpdatingPrices ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="megaphone-outline" size={20} color="#fff" />
                            <Text style={styles.savePricesText}>Confirm & Post to Market</Text>
                        </>
                    )}
                </TouchableOpacity>
                <Text style={styles.disclaimerText}>
                    * Once posted, these prices will be visible to District Buyers for wholesale purchase.
                </Text>
            </View>
        );
    };
    const renderGradeCSection = () => {
        const wasteWeight = summary?.wasteProduct || 0;
        if (wasteWeight === 0) return null;

        return (
            <View style={[styles.section, { borderLeftWidth: 5, borderLeftColor: '#f59e0b' }]}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="trash-outline" size={24} color="#f59e0b" />
                    <Text style={styles.sectionTitle}>Grade C (Waste/Industrial)</Text>
                </View>
                
                <Text style={styles.infoText}>Total Stock: {wasteWeight.toFixed(1)} kg</Text>
                
                {finances?.gradeCRevenue > 0 ? (
                    <View style={styles.soldBadge}>
                        <Ionicons name="checkmark-done" size={16} color="#166534" />
                        <Text style={styles.soldText}>Sold for LKR {finances.gradeCRevenue.toLocaleString()}</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.sellWasteBtn} onPress={handleSellGradeC}>
                        <Text style={styles.sellWasteText}>Sell to Dry Fish Market</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderFinancialSection = () => {
        if (!finances || !summary) return null;

        const isSold = summary.status === 'sold';
        
        // Calculate Estimates if not sold
        let displayRevenue = finances.totalRevenue;
        let isEstimate = false;

        if (!isSold && prices.length > 0) {
            isEstimate = true;
            let estimatedRev = 0;
            prices.forEach(p => {
                const typeWeights = summary.catchBreakdownDetails?.[p.fishType] || { gradeA: 0, gradeB: 0 };
                estimatedRev += (typeWeights.gradeA * p.priceA) + (typeWeights.gradeB * p.priceB);
            });
            estimatedRev += (finances.gradeCRevenue || 0);
            displayRevenue = estimatedRev;
        }

        const displayNetProfit = displayRevenue - finances.totalCosts;

        // Earnings distribution for estimates
        const distOwner = displayNetProfit * (finances.commissions.owner / 100);
        const distPlanner = displayNetProfit * (finances.commissions.planner / 100);
        const distCrewTotal = displayNetProfit * (finances.commissions.crew / 100);
        const crewCount = summary.crew?.length || 1;

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="cash-outline" size={24} color="#2563eb" />
                    <Text style={styles.sectionTitle}>
                        {isEstimate ? "Estimated Financials" : "Finalized Financials"}
                    </Text>
                    {isEstimate && (
                        <View style={styles.estimateBadge}>
                            <Text style={styles.estimateBadgeText}>PENDING SALE</Text>
                        </View>
                    )}
                </View>

                <View style={styles.financeCard}>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>{isEstimate ? "Potential Revenue" : "Total Revenue"}</Text>
                        <Text style={[styles.financeValue, { color: '#10b981' }]}>LKR {displayRevenue.toLocaleString()}</Text>
                    </View>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Total Costs</Text>
                        <Text style={[styles.financeValue, { color: '#ef4444' }]}>- LKR {finances.totalCosts.toLocaleString()}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.financeRow}>
                        <Text style={styles.profitLabel}>{isEstimate ? "Projected Profit" : "Net Profit"}</Text>
                        <Text style={styles.profitValue}>LKR {displayNetProfit.toLocaleString()}</Text>
                    </View>
                </View>

                <Text style={styles.subTitle}>{isEstimate ? "Projected Distribution" : "Earnings Distribution"}</Text>
                <View style={styles.distributionGrid}>
                    <View style={styles.distItem}>
                        <Text style={styles.distLabel}>Owner ({finances.commissions.owner}%)</Text>
                        <Text style={styles.distAmount}>LKR {distOwner.toLocaleString()}</Text>
                    </View>
                    <View style={styles.distItem}>
                        <Text style={styles.distLabel}>Planner ({finances.commissions.planner}%)</Text>
                        <Text style={styles.distAmount}>LKR {distPlanner.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.distItem, { width: '100%' }]}>
                        <Text style={styles.distLabel}>Crew Shared ({finances.commissions.crew}%)</Text>
                        <View style={styles.crewRow}>
                             <Text style={styles.distAmount}>Total: LKR {distCrewTotal.toLocaleString()}</Text>
                             <Text style={styles.crewNote}>Per Fisherman: LKR {(distCrewTotal / crewCount).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
                
                {isEstimate && (
                    <Text style={styles.disclaimerText}>
                        * Estimates based on your asking prices. Final profit will be updated once a Buyer completes the purchase.
                    </Text>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Generating Trip Statement...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={summary?.status === 'sold' ? ['#065f46', '#064e3b'] : ['#1e3a8a', '#1e40af']} 
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnHeader}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {summary?.status === 'sold' ? 'Final Trip Statement' : 'Trip Summary & Estimates'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="stats-chart-outline" size={24} color="#2563eb" />
                        <Text style={styles.sectionTitle}>Catch Summary</Text>
                    </View>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Total Weight</Text>
                            <Text style={styles.statValue}>{summary?.totalWeight || 0} kg</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Total Catches</Text>
                            <Text style={styles.statValue}>{summary?.catchCount || 0}</Text>
                        </View>
                    </View>
                </View>

                {renderCrewManagement()}
                {renderPriceSettings()}
                {renderGradeCSection()}
                {renderFinancialSection()}

                <View style={styles.actionRow}>
                    {summary?.status === 'planned' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 }]}
                            onPress={handleCancelTrip}
                        >
                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel Trip</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Back to Home</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    backBtnHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20 },
    section: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { flex: 1, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 5 },
    statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    statValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4 },
    financeCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 15 },
    financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    financeLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    financeValue: { fontSize: 14, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
    profitLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    profitValue: { fontSize: 18, fontWeight: '900', color: '#2563eb' },
    subTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 12 },
    distributionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    distItem: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, width: '47%' },
    distLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4 },
    distAmount: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    crewRow: { marginTop: 4 },
    crewNote: { fontSize: 10, color: '#2563eb', fontWeight: '600', marginTop: 2 },
    soldBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', padding: 8, borderRadius: 8, marginTop: 10, gap: 5 },
    soldText: { color: '#166534', fontSize: 13, fontWeight: '700' },
    sellWasteBtn: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fcd34d' },
    sellWasteText: { color: '#92400e', fontSize: 14, fontWeight: '800' },
    crewMemberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8 },
    memberName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    removeBtn: { padding: 4 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 40 },
    actionBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { fontSize: 16, fontWeight: '800' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
    priceSettingCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    fishTypeName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
    priceRowInputs: { flexDirection: 'row', gap: 10 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 4 },
    priceInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 8, fontSize: 14, fontWeight: '700', color: '#2563eb' },
    savePricesBtn: { backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, marginTop: 15, gap: 10, elevation: 5 },
    savePricesText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    infoText: { fontSize: 13, color: '#64748b', marginBottom: 15, fontWeight: '500' },
    sectionSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    estimateBadge: {
        backgroundColor: '#fff7ed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffedd5',
    },
    estimateBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#c2410c',
    },
    disclaimerText: {
        marginTop: 15,
        fontSize: 11,
        color: '#94a3b8',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    priceCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    activeTag: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    activeTagText: {
        fontSize: 10,
        color: '#2563eb',
        fontWeight: '800',
    },
    noCatchBox: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
    },
    noCatchText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },
});


export default TripSummaryScreen;
