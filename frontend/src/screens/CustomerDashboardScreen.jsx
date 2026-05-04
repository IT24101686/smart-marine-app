import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import MapComponent from '../components/MapComponent';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const CustomerDashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [availableCatches, setAvailableCatches] = useState([]);
    const [filteredCatches, setFilteredCatches] = useState([]);
    const [selectedType, setSelectedType] = useState('All');
    const [expandedMapId, setExpandedMapId] = useState(null);
    const [user, setUser] = useState(null);
    const [showMyLocation, setShowMyLocation] = useState(false);
    const [marketRates, setMarketRates] = useState([]);
    const [cart, setCart] = useState([]);
    const [buyerPricesMap, setBuyerPricesMap] = useState({}); // { buyerId: [prices] }
    const [recentOrders, setRecentOrders] = useState([]);


    const fishTypes = ['All', 'Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)'];


    useEffect(() => {
        loadUserAndCatches();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                fetchAvailableCatches(user.district);
                fetchRecentOrders();
                fetchCart();
            }
            return () => { };
        }, [user])
    );

    const loadUserAndCatches = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                fetchAvailableCatches(parsedUser.district);
                fetchRecentOrders();
                fetchCart();
            } else {
                fetchAvailableCatches('Galle');
            }
            fetchMarketRates();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMarketRates = async () => {
        try {
            const response = await client.get('/api/market-rates');
            setMarketRates(response.data);
        } catch (error) {
            console.error("Fetch rates error:", error);
        }
    };

    const fetchRecentOrders = async () => {
        try {
            const res = await client.get('/api/orders/my');
            setRecentOrders(res.data.slice(0, 3)); // Only show top 3
        } catch (e) {
            console.warn('Could not fetch recent orders:', e.message);
        }
    };

    const fetchCart = async () => {
        try {
            const response = await client.get('/api/users/cart');
            if (response.data) {
                setCart(response.data);
            }
        } catch (e) {
            console.error("Error fetching cart:", e);
        }
    };

    const fetchAvailableCatches = async (userDistrict) => {
        try {
            const response = await client.get(`/api/inventory/market?district=${userDistrict}`);
            const data = Array.isArray(response.data) ? response.data : [];

            // Get unique seller IDs
            const sellerIds = [...new Set(data.map(i => i.sellerId?._id).filter(Boolean))];

            // Fetch prices for all these sellers
            const pricesMap = {};
            await Promise.all(sellerIds.map(async (sid) => {
                try {
                    const res = await client.get(`/api/buyer-prices/${sid}`);
                    pricesMap[sid] = res.data;
                } catch (e) {
                    pricesMap[sid] = [];
                }
            }));
            setBuyerPricesMap(pricesMap);

            setAvailableCatches(data);
            setFilteredCatches(data);
        } catch (error) {
            console.error("Fetch inventory error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedType === 'All') {
            setFilteredCatches(availableCatches);
        } else {
            const filtered = availableCatches.filter(trip =>
                trip.summary && trip.summary.catchBreakdown && trip.summary.catchBreakdown[selectedType]
            );
            setFilteredCatches(filtered);
        }
    }, [selectedType, availableCatches]);

    const addToCart = async (item) => {
        const fishType = item.fishType;
        const sellerId = item.sellerId?._id;
        const buyerPrices = buyerPricesMap[sellerId] || [];
        const bPrice = buyerPrices.find(p => p.fishType === fishType);

        // If buyer hasn't set price, fallback to global market rates
        const globalRate = marketRates.find(r => r.fishType === fishType);
        const price = bPrice ? bPrice.retailPriceB : (globalRate?.retailPriceB || 1300);

        const cartItem = {
            id: `${item._id}`, // Use inventory ID
            tripId: item.tripId?._id,
            buyerId: sellerId,
            buyerName: item.sellerId?.name,
            fishType,
            weight: 1, // Default 1kg
            price,
            availableStock: item.weight,
            grade: item.grade,
            image: item.photos?.[0] || item.sellerId?.profileImage
        };

        const updatedCart = (() => {
            const existing = cart.find(i => i.id === cartItem.id);
            if (existing) {
                return cart.map(i => i.id === cartItem.id ? { ...i, weight: i.weight + 1 } : i);
            }
            return [...cart, cartItem];
        })();

        setCart(updatedCart);

        // Save to DB
        try {
            await client.post('/api/users/cart', { cart: updatedCart });
        } catch (e) {
            console.error("Error saving cart:", e);
        }

        Alert.alert("Added to Cart", `${fishType} added to your selection.`);
    };


    const renderHeroCarousel = () => {
        const featured = availableCatches.slice(0, 5); // Show first 5 as featured
        if (featured.length === 0) return null;

        return (
            <View style={styles.carouselContainer}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.carouselTitle}>Featured Fresh Catches</Text>
                    <Text style={styles.liveBadge}>LIVE</Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={width * 0.75 + 20}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselScroll}
                >
                    {featured.map((item, idx) => {
                        const type = Object.keys(item.summary?.catchBreakdown || {})[0] || 'Fish';
                        return (
                            <TouchableOpacity key={idx} style={styles.heroCard}>
                                <LinearGradient
                                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
                                    style={styles.heroGradient}
                                />
                                {item.catches?.[0]?.photos?.[0] ? (
                                    <Image source={{ uri: item.catches[0].photos[0] }} style={styles.heroImage} />
                                ) : (
                                    <View style={[styles.heroImage, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="boat" size={60} color="#334155" />
                                    </View>
                                )}
                                <View style={styles.heroInfo}>
                                    <View style={styles.heroTag}>
                                        <Text style={styles.heroTagText}>PREMIUM CHOICE</Text>
                                    </View>
                                    <Text style={styles.heroTitle}>{type}</Text>
                                    <View style={styles.heroRow}>
                                        <Ionicons name="person-circle-outline" size={14} color="#cbd5e1" />
                                        <Text style={styles.heroSubtitle}>{item.buyerId?.name}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    const renderMarketGrid = () => {
        // Flat inventory is already typed
        const allProducts = selectedType === 'All'
            ? availableCatches
            : availableCatches.filter(i => i.fishType === selectedType);

        if (allProducts.length === 0 && availableCatches.length > 0) return null;

        return (
            <View style={styles.marketSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Market Explorer</Text>
                </View>

                <View style={styles.gridContainer}>
                    {allProducts.map((item, index) => (
                        <View key={item._id} style={styles.miniCatchCard}>
                            <View style={styles.miniImageContainer}>
                                {item.photos?.[0] ? (
                                    <Image source={{ uri: item.photos[0] }} style={styles.miniCatchImage} />
                                ) : (
                                    <View style={styles.noImagePlaceholder}>
                                        <Ionicons name="fish-outline" size={30} color="#cbd5e1" />
                                    </View>
                                )}
                                <View style={styles.gradeBadge}>
                                    <Text style={styles.gradeBadgeText}>{item.fishType.split(' ')[0]}</Text>
                                </View>
                            </View>

                            <View style={styles.cardInfoPadding}>
                                <View style={styles.miniCardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.miniVesselName} numberOfLines={1}>{item.sellerId?.name || "Seller"}</Text>
                                        <Text style={styles.miniLocation}>{item.sellerId?.district}</Text>
                                    </View>
                                    <View style={styles.ratingBox}>
                                        <Ionicons name="star" size={8} color="#f59e0b" />
                                        <Text style={styles.ratingText}>4.9</Text>
                                    </View>
                                </View>

                                <View style={styles.stockBadge}>
                                    <Text style={styles.miniStock}>{item.weight.toFixed(1)} kg Left</Text>
                                </View>

                                <View style={styles.miniPriceRow}>
                                    <Text style={styles.miniPrice}>
                                        LKR {(() => {
                                            const bId = item.buyerId?._id;
                                            const bPrices = buyerPricesMap[bId] || [];
                                            const bPrice = bPrices.find(p => p.fishType === item.displayType);
                                            const gRate = marketRates.find(r => r.fishType === item.displayType);
                                            const p = bPrice ? bPrice.retailPriceB : (gRate?.retailPriceB || 1300);
                                            return p.toLocaleString();
                                        })()}
                                    </Text>
                                </View>

                                <View style={styles.miniPriceRow}>
                                    <Text style={styles.miniPrice}>LKR {((buyerPricesMap[item.sellerId?._id]?.find(p => p.fishType === item.fishType)?.retailPriceB) || (marketRates.find(r => r.fishType === item.fishType)?.retailPriceB) || 1300).toLocaleString()}</Text>
                                    <TouchableOpacity
                                        onPress={() => addToCart(item)}
                                        style={styles.miniAddBtn}
                                    >
                                        <Ionicons name="add" size={16} color="#fff" />
                                        <Text style={styles.miniAddText}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <LinearGradient colors={['#0f172a', '#1e3a8a']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.welcomeText}>District Market</Text>
                            <Text style={styles.subText}>Fresh catch in {user?.district || 'your area'}</Text>
                        </View>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Cart', { cart, user })}
                                style={styles.iconBtn}
                            >
                                <Ionicons name="cart-outline" size={24} color="#fff" />
                                {cart.length > 0 && (
                                    <View style={styles.cartBadge}>
                                        <Text style={styles.cartBadgeText}>{cart.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')} style={styles.iconBtn}>
                                <Ionicons name="list-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
                                <Ionicons name="person-circle-outline" size={30} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.categorySection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {fishTypes.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.categoryChip, selectedType === type && styles.activeCategoryChip]}
                            onPress={() => setSelectedType(type)}
                        >
                            <Ionicons
                                name={type === 'All' ? 'apps' : 'fish'}
                                size={18}
                                color={selectedType === type ? '#fff' : '#64748b'}
                            />
                            <Text style={[styles.categoryText, selectedType === type && styles.activeCategoryText]}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.deliverySection}>
                <TouchableOpacity
                    style={styles.deliveryCard}
                    onPress={() => setShowMyLocation(!showMyLocation)}
                >
                    <View style={styles.deliveryInfo}>
                        <Ionicons name="location-sharp" size={24} color="#2563eb" />
                        <View>
                            <Text style={styles.deliveryLabel}>Delivery to:</Text>
                            <Text style={styles.deliveryAddress} numberOfLines={1}>{user?.address || 'Set your address in profile'}</Text>
                        </View>
                    </View>
                    <Ionicons name={showMyLocation ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
                </TouchableOpacity>

                {showMyLocation && (
                    <View style={styles.myLocationMapContainer}>
                        <MapComponent address1={user?.address} />
                        <Text style={styles.locationNote}>Orders will be delivered to this location</Text>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainScrollContent}>

                    {/* ── My Recent Orders (New Section) ── */}
                    {recentOrders.length > 0 && (
                        <View style={styles.sectionWrapper}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Active Orders</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                {recentOrders.map((order) => (
                                    <TouchableOpacity
                                        key={order._id}
                                        style={styles.orderMiniCard}
                                        onPress={() => navigation.navigate('OrderManagement')}
                                    >
                                        <View style={styles.orderCardHeader}>
                                            <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(order.status) }]} />
                                            <Text style={styles.orderStatusText}>{order.status.toUpperCase()}</Text>
                                        </View>
                                        <Text style={styles.orderItemNames} numberOfLines={1}>
                                            {order.items.map(it => it.fishType).join(', ')}
                                        </Text>
                                        <View style={styles.orderCardFooter}>
                                            <Text style={styles.orderTotalLabel}>Total:</Text>
                                            <Text style={styles.orderTotalValue}>LKR {order.totalPrice?.toLocaleString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {renderHeroCarousel()}
                    {renderMarketGrid()}

                    {availableCatches.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={80} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No district buyers have listed stock in {user?.district || 'this area'} yet.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingBottom: 25,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 15,
        alignItems: 'center',
    },
    iconBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        padding: 8,
        borderRadius: 12,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    subText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    categorySection: {
        marginTop: 20,
        paddingLeft: 24,
    },
    categoryScroll: {
        flexDirection: 'row',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
    },
    activeCategoryChip: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    activeCategoryText: {
        color: '#fff',
    },
    deliverySection: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    deliveryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    deliveryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deliveryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    deliveryAddress: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e293b',
        width: width * 0.5,
    },
    mainScrollContent: {
        paddingBottom: 40,
    },
    sectionWrapper: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    horizontalScroll: {
        paddingLeft: 24,
    },
    miniCatchCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: (width - 64) / 2, // Two columns with padding
        marginBottom: 16,
        elevation: 6,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    miniImageContainer: {
        width: '100%',
        height: 110,
        backgroundColor: '#f8fafc',
    },
    miniCatchImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardInfoPadding: {
        padding: 16,
    },
    gradeBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#22c55e',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    gradeBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    miniCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    miniVesselName: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1e293b',
    },
    miniLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    miniLocation: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#9a3412',
    },
    miniInfoRow: {
        marginBottom: 12,
    },
    stockBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    miniStock: {
        fontSize: 11,
        color: '#2563eb',
        fontWeight: '800',
    },
    miniPriceRow: {
        marginBottom: 16,
    },
    miniPriceLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    miniPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f172a',
    },
    miniAddBtn: {
        backgroundColor: '#2563eb',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        gap: 6,
    },
    miniAddText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    cartBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    carouselContainer: {
        marginTop: 20,
    },
    carouselTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
        paddingHorizontal: 24,
        marginBottom: 15,
    },
    liveBadge: {
        backgroundColor: '#ef4444',
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 24,
    },
    carouselScroll: {
        paddingLeft: 24,
        paddingBottom: 20,
    },
    heroCard: {
        width: width * 0.75,
        height: 200,
        borderRadius: 32,
        marginRight: 20,
        backgroundColor: '#000',
        overflow: 'hidden',
        elevation: 12,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        zIndex: 1,
    },
    heroInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 2,
    },
    heroTag: {
        backgroundColor: '#2563eb',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    heroTagText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroSubtitle: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    marketSection: {
        marginTop: 10,
    },
    viewAllText: {
        fontSize: 12,
        color: '#2563eb',
        fontWeight: '700',
        marginRight: 24,
    },
    orderMiniCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 16,
        marginRight: 15,
        width: 180,
    },
    orderCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statusDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    orderStatusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
    },
    orderItemNames: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 10,
    },
    orderCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 8,
    },
    orderTotalLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
    },
    orderTotalValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#22c55e',
    },
});

const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#f59e0b';
        case 'confirmed': return '#3b82f6';
        case 'delivered': return '#10b981';
        case 'cancelled': return '#ef4444';
        default: return '#64748b';
    }
};

export default CustomerDashboardScreen;
