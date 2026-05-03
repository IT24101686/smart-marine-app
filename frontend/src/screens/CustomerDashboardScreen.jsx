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


    const fishTypes = ['All', 'Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)'];


    useEffect(() => {
        loadUserAndCatches();
    }, []);

    const loadUserAndCatches = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                fetchAvailableCatches(parsedUser.district);
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

    const fetchAvailableCatches = async (userDistrict) => {
        try {
            const response = await client.get('/api/trips/market/all'); 
            const data = Array.isArray(response.data) ? response.data : [];
            
            // Show trips that are sold to a buyer in this district
            const soldTrips = data.filter(t => t.status === 'sold' && t.buyerId?.district === userDistrict);

            const tripsWithSummary = await Promise.all(soldTrips.map(async (trip) => {
                try {
                    const summaryRes = await client.get(`/api/trips/${trip._id}/summary`);
                    return { ...trip, summary: summaryRes.data };
                } catch (e) {
                    return { ...trip, summary: { customerStock: 0, catchBreakdown: {} } };
                }
            }));

            setAvailableCatches(tripsWithSummary);
            setFilteredCatches(tripsWithSummary);
        } catch (error) {
            console.error("Fetch catches error:", error);
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

    const addToCart = (trip, fishType) => {
        const rate = marketRates.find(r => r.fishType === fishType) || marketRates[0];
        const price = rate?.retailPriceB || 1300;
        
        const cartItem = {
            id: `${trip._id}-${fishType}`,
            tripId: trip._id,
            buyerId: trip.buyerId?._id,
            buyerName: trip.buyerId?.name,
            fishType,
            weight: 1, // Default 1kg
            price,
            availableStock: trip.summary?.catchBreakdown?.[fishType] || 0,
            image: trip.catches?.[0]?.photos?.[0] || trip.vesselId?.profileImage 
        };

        setCart(prev => {
            const existing = prev.find(i => i.id === cartItem.id);
            if (existing) {
                return prev.map(i => i.id === cartItem.id ? { ...i, weight: i.weight + 1 } : i);
            }
            return [...prev, cartItem];
        });
        
        Alert.alert("Added to Cart", `${fishType} added to your selection.`);
    };


    const renderCategorySection = (type) => {
        const items = availableCatches.filter(trip => 
            trip.summary && trip.summary.catchBreakdown && trip.summary.catchBreakdown[type]
        );

        if (items.length === 0) return null;

        return (
            <View key={type} style={styles.sectionWrapper}>
                <Text style={styles.sectionTitle}>{type}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {items.map((item) => (
                        <View key={item._id} style={styles.miniCatchCard}>
                            <View style={styles.miniImageContainer}>
                                {item.catches?.[0]?.photos?.[0] ? (
                                    <Image source={{ uri: item.catches[0].photos[0] }} style={styles.miniCatchImage} />
                                ) : (
                                    <View style={styles.noImagePlaceholder}>
                                        <Ionicons name="image-outline" size={24} color="#94a3b8" />
                                    </View>
                                )}
                                <View style={styles.gradeBadge}>
                                    <Text style={styles.gradeBadgeText}>FRESH</Text>
                                </View>
                            </View>

                            <View style={styles.miniCardHeader}>
                                <Text style={styles.miniVesselName} numberOfLines={1}>{item.buyerId?.name || "Premium Buyer"}</Text>
                                <View style={styles.ratingBox}>
                                    <Ionicons name="star" size={10} color="#f59e0b" />
                                    <Text style={styles.ratingText}>4.8</Text>
                                </View>
                            </View>
                            
                            <View style={styles.miniInfoRow}>
                                <Ionicons name="scale-outline" size={12} color="#64748b" />
                                <Text style={styles.miniStock}>{(item.summary.catchBreakdown[type]).toFixed(1)} kg available</Text>
                            </View>

                            <View style={styles.miniPriceRow}>
                                <Text style={styles.miniPriceLabel}>Per KG</Text>
                                <Text style={styles.miniPrice}>LKR {(marketRates.find(r => r.fishType === type)?.retailPriceB || 1300).toLocaleString()}</Text>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.miniAddBtn}
                                onPress={() => addToCart(item, type)}
                            >
                                <Ionicons name="add" size={20} color="#fff" />
                                <Text style={styles.miniAddText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
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
                    {fishTypes.filter(t => t !== 'All').map(type => renderCategorySection(type))}
                    
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
        padding: 12,
        marginRight: 16,
        width: 190,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    miniImageContainer: {
        width: '100%',
        height: 120,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#f1f5f9',
    },
    miniCatchImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    noImagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradeBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    gradeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    miniCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    miniVesselName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1e293b',
        flex: 1,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 3,
    },
    ratingText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#b45309',
    },
    miniInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    miniStock: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    miniPriceRow: {
        marginTop: 2,
    },
    miniPriceLabel: {
        fontSize: 9,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    miniPrice: {
        fontSize: 18,
        fontWeight: '900',
        color: '#2563eb',
    },
    miniAddBtn: {
        backgroundColor: '#0f172a',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        marginTop: 12,
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
    }
});

export default CustomerDashboardScreen;
