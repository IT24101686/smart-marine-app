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

    const updateWeight = async (itemId, delta) => {
        const updatedCart = cart.map(item => {
            const id = item.id || item._id;
            if (id === itemId) {
                const newWeight = Math.max(0.5, item.weight + delta);
                if (newWeight > (item.availableStock || 999)) {
                    Alert.alert("Stock Limit", `Only ${item.availableStock}kg available.`);
                    return item;
                }
                return { ...item, weight: newWeight };
            }
            return item;
        }).filter(item => item.weight > 0);

        setCart(updatedCart);
        try {
            await client.post('/api/users/cart', { cart: updatedCart });
        } catch (e) {
            console.error("Save cart error:", e);
        }
    };

    const removeItem = async (itemId) => {
        const updatedCart = cart.filter(item => (item.id || item._id) !== itemId);
        setCart(updatedCart);
        try {
            await client.post('/api/users/cart', { cart: updatedCart });
        } catch (e) {
            console.error("Save cart error:", e);
        }
    };

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.price * item.weight), 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            setLoading(true);
            
            // Group items by buyer and trip to match order schema
            const groupings = {};
            cart.forEach(item => {
                const key = `${item.buyerId}-${item.tripId}`;
                if (!groupings[key]) {
                    groupings[key] = {
                        buyerId: item.buyerId,
                        tripId: item.tripId,
                        items: [],
                        total: 0
                    };
                }
                groupings[key].items.push({
                    inventoryId: item.id,
                    fishType: item.fishType,
                    weight: item.weight,
                    price: item.price,
                    grade: item.grade || 'Grade B'
                });
                groupings[key].total += (item.price * item.weight);
            });
            
            for (const key in groupings) {
                const group = groupings[key];
                await client.post('/api/orders', {
                    buyerId: group.buyerId,
                    tripId: group.tripId,
                    items: group.items,
                    totalPrice: group.total,
                    deliveryAddress: user?.address
                });
            }

            // Clear Cart in DB and Local State after success
            try {
                await client.post('/api/users/cart', { cart: [] });
                setCart([]); // Clear local state too!
            } catch (e) {
                console.error("Clear cart error:", e);
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
                        <TouchableOpacity 
                            onPress={() => {
                                Alert.alert("Clear Cart", "Do you want to remove everything?", [
                                    { text: "Cancel" },
                                    { text: "Clear All", onPress: () => {
                                        setCart([]);
                                        client.post('/api/users/cart', { cart: [] });
                                    }, style: 'destructive' }
                                ]);
                            }}
                            style={styles.clearBtn}
                        >
                            <Ionicons name="trash-outline" size={22} color="#fff" />
                        </TouchableOpacity>
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
                                    <TouchableOpacity onPress={() => updateWeight(item.id || item._id, -0.5)} style={styles.qtyBtn}>
                                        <Ionicons name="remove" size={18} color="#1e293b" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyValue}>{item.weight.toFixed(1)}kg</Text>
                                    <TouchableOpacity onPress={() => updateWeight(item.id || item._id, 0.5)} style={styles.qtyBtn}>
                                        <Ionicons name="add" size={18} color="#1e293b" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => removeItem(item.id || item._id)} style={styles.removeBtn}>
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
    headerContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 24, 
        paddingTop: 10 
    },
    backBtn: { 
        width: 45, 
        height: 45, 
        borderRadius: 15, 
        backgroundColor: 'rgba(255,255,255,0.15)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    clearBtn: { 
        width: 45, 
        height: 45, 
        borderRadius: 15, 
        backgroundColor: 'rgba(239, 68, 68, 0.3)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    scrollContent: { padding: 20, paddingBottom: 100 },
    cartItem: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        borderRadius: 28, 
        padding: 16, 
        marginBottom: 16, 
        alignItems: 'center', 
        elevation: 8,
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
    },
    itemImageContainer: { 
        width: 85, 
        height: 85, 
        borderRadius: 20, 
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
    itemDetails: { flex: 1, marginLeft: 16 },
    itemName: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    itemSource: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
    itemPrice: { fontSize: 15, fontWeight: '900', color: '#2563eb', marginTop: 10 },
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 80,
    },
    quantityControls: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    qtyBtn: { 
        width: 26, 
        height: 26, 
        borderRadius: 8, 
        backgroundColor: '#fff', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    qtyValue: { fontSize: 12, fontWeight: '900', color: '#0f172a', minWidth: 40, textAlign: 'center' },
    removeBtn: { padding: 4 },
    removeText: { color: '#ef4444', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    footer: { 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff', 
        padding: 24, 
        paddingBottom: 34,
        borderTopLeftRadius: 40, 
        borderTopRightRadius: 40, 
        elevation: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -15 },
        shadowOpacity: 0.1,
        shadowRadius: 25,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    totalLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    totalValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    checkoutBtn: { 
        height: 64, 
        backgroundColor: '#0f172a', 
        borderRadius: 22, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 12,
        elevation: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    emptyCart: { alignItems: 'center', marginTop: 120, paddingHorizontal: 40 },
    emptyText: { fontSize: 18, color: '#94a3b8', fontWeight: '700', marginTop: 24, textAlign: 'center' },
    shopBtn: { 
        marginTop: 30, 
        paddingHorizontal: 36, 
        paddingVertical: 18, 
        backgroundColor: '#2563eb', 
        borderRadius: 20,
        elevation: 8,
    },
    shopBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});

export default CartScreen;
