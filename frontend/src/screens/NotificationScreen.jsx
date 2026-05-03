import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const NotificationScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await client.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id) => {
        try {
            await client.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n => 
                n._id === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'trip': return { name: 'boat', color: '#2563eb' };
            case 'order': return { name: 'cart', color: '#10b981' };
            case 'payment': return { name: 'cash', color: '#f59e0b' };
            default: return { name: 'notifications', color: '#64748b' };
        }
    };

    const renderNotification = ({ item }) => {
        const icon = getIcon(item.type);
        return (
            <TouchableOpacity 
                style={[styles.card, !item.isRead && styles.unreadCard]}
                onPress={() => markAsRead(item._id)}
            >
                <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>
                <View style={styles.content}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1e3a8a', '#1e40af']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No notifications yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    list: { padding: 20 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
    unreadCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, marginLeft: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    unreadTitle: { color: '#1e3a8a' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
    message: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },
    time: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 16, fontWeight: '600' }
});

export default NotificationScreen;
