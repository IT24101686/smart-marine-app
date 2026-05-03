import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const CartScreen = ({ route, navigation }) => {
    const { cart: initialCart, user } = route.params;
    const [cart, setCart] = useState(initialCart);
    const [loading, setLoading] = useState(false);

    const updateWeight = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newWeight = Math.max(0.5, item.weight + delta);
                // Validation against available stock
                if (newWeight > (item.availableStock || 999)) {
                    Alert.alert("Stock Limit", `Only ${item.availableStock}kg available for this catch.`);
                    return item;
                }
                return { ...item, weight: newWeight };
            }
            return item;
        }).filter(item => item.weight > 0));
    };

    const removeItem = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.price * item.weight), 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            setLoading(true);
            
            // We group items by buyerId because one order belongs to one buyer in our schema
            // For simplicity, we assume all items in cart are from the same buyer or we process them separately
            const buyerIds = [...new Set(cart.map(item => item.buyerId))];
            
            for (const buyerId of buyerIds) {
                const itemsForBuyer = cart.filter(item => item.buyerId === buyerId);
                const total = itemsForBuyer.reduce((acc, item) => acc + (item.price * item.weight), 0);

                await client.post('/api/orders', {
                    buyerId,
                    items: itemsForBuyer.map(item => ({
                        fishType: item.fishType,
                        weight: item.weight,
                        price: item.price,
                        grade: 'Grade B'
                    })),
                    totalPrice: total,
                    deliveryAddress: user?.address
                });
            }

            Alert.alert(
                "Order Placed!", 
                "Your order has been sent to the distributors. Track it on the map now.",
                [{ text: "Track on Map", onPress: () => navigation.navigate('OrderManagement') }]
            );
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to place order.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Your Shopping Cart</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {cart.length > 0 ? (
                    cart.map((item) => (
                        <View key={item.id} style={styles.cartItem}>
                            <View style={styles.itemImageContainer}>
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                                ) : (
                                    <Ionicons name="fish" size={30} color="#2563eb" />
                                )}
                            </View>
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName} numberOfLines={1}>{item.fishType}</Text>
                                <View style={styles.sourceRow}>
                                    <Ionicons name="business-outline" size={12} color="#64748b" />
                                    <Text style={styles.itemSource}>{item.buyerName}</Text>
                                </View>
                                <Text style={styles.itemPrice}>LKR {item.price.toLocaleString()} / kg</Text>
                            </View>
                            <View style={styles.rightSection}>
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity onPress={() => updateWeight(item.id, -0.5)} style={styles.qtyBtn}>
                                        <Ionicons name="remove" size={18} color="#1e293b" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyValue}>{item.weight.toFixed(1)}kg</Text>
                                    <TouchableOpacity onPress={() => updateWeight(item.id, 0.5)} style={styles.qtyBtn}>
                                        <Ionicons name="add" size={18} color="#1e293b" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCart}>
                        <Ionicons name="cart-outline" size={100} color="#cbd5e1" />
                        <Text style={styles.emptyText}>Your cart is empty</Text>
                        <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.shopBtnText}>Go Shopping</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {cart.length > 0 && (
                <View style={styles.footer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>LKR {calculateTotal().toLocaleString()}</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.checkoutBtn} 
                        onPress={handleCheckout}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.checkoutBtnText}>Place Order & Track</Text>
                                <Ionicons name="navigate" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingBottom: 20 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    title: { color: '#fff', fontSize: 18, fontWeight: '800' },
    scrollContent: { padding: 20 },
    cartItem: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        borderRadius: 24, 
        padding: 12, 
        marginBottom: 16, 
        alignItems: 'center', 
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    itemImageContainer: { 
        width: 80, 
        height: 80, 
        borderRadius: 18, 
        backgroundColor: '#f1f5f9', 
        justifyContent: 'center', 
        alignItems: 'center',
        overflow: 'hidden'
    },
    itemImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    itemDetails: { flex: 1, marginLeft: 12 },
    itemName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    itemSource: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    itemPrice: { fontSize: 15, fontWeight: '800', color: '#2563eb', marginTop: 8 },
    rightSection: {
        alignItems: 'flex-end',
        gap: 8,
    },
    quantityControls: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 4,
    },
    qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 1 },
    qtyValue: { fontSize: 13, fontWeight: '800', color: '#1e293b', minWidth: 45, textAlign: 'center' },
    removeBtn: { paddingHorizontal: 8 },
    removeText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
    footer: { 
        backgroundColor: '#fff', 
        padding: 24, 
        borderTopLeftRadius: 36, 
        borderTopRightRadius: 36, 
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    totalLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    totalValue: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    checkoutBtn: { height: 64, backgroundColor: '#0f172a', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    emptyCart: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 18, color: '#94a3b8', fontWeight: '600', marginTop: 20 },
    shopBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 16, backgroundColor: '#2563eb', borderRadius: 18 },
    shopBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

export default CartScreen;
