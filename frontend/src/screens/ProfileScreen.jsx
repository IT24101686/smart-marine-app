import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image, 
    TextInput, 
    Alert,
    Dimensions,
    ActivityIndicator
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { uploadToServer } from '../api/uploadService';
import MapComponent from '../components/MapComponent';
import ImageUploadButton from '../components/ImageUploadButton';


const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [myTrips, setMyTrips] = useState([]);
    const [totalEarnings, setTotalEarnings] = useState(0);

    // Form States
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [image, setImage] = useState(null);

    useEffect(() => {
        loadUserData();
        fetchMyTrips();
    }, []);

    const loadUserData = async () => {
        try {
            const data = await AsyncStorage.getItem('userData');
            if (data) {
                try {
                    const parsedUser = JSON.parse(data);
                    setUser(parsedUser);
                    setName(parsedUser.name || '');
                    setPhone(parsedUser.phone || '');
                    setAddress(parsedUser.address || '');
                    setImage(parsedUser.profileImage || null);
                } catch (parseError) {
                    console.error("Profile JSON parse error:", parseError);
                }
            }
        } catch (error) {
            console.error("Profile load error:", error);
        } finally {
            setLoading(false);
        }
    };


    const fetchMyTrips = async () => {
        try {
            const response = await client.get('/api/trips/my-trips');
            setMyTrips(response.data);
            
            // Also fetch earnings for summary
            const payoutRes = await client.get('/api/trips/payouts');
            const total = payoutRes.data.reduce((acc, curr) => acc + curr.amount, 0);
            setTotalEarnings(total);
        } catch (error) {
            console.error("Error fetching trips:", error);
        }
    };


    const handleImageUploaded = async (url) => {
        try {
            const updatedUser = { ...user, profileImage: url };
            setUser(updatedUser);
            setImage(url);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            
            // Sync with server
            await client.put('/api/users/profile', { profileImage: url });
            Alert.alert("Success", "Profile photo updated!");
        } catch (error) {
            Alert.alert("Error", "Failed to update profile on server");
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            try {
                setLoading(true);
                const publicUrl = await uploadToServer(result.assets[0].uri);
                setImage(publicUrl);
                await handleImageUploaded(publicUrl);
            } catch (error) {
                Alert.alert("Error", "Failed to upload profile photo");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            const response = await client.put('/api/users/profile', {
                name,
                phone,
                address,
                profileImage: image
            });

            const updatedUser = response.data;
            setUser(updatedUser);
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            
            Alert.alert("Success", "Profile updated successfully!");
            setIsEditing(false);
        } catch (error) {
            console.error("Profile update error:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Gradient */}
                <LinearGradient
                    colors={['#0f172a', '#1e3a8a']}
                    style={styles.headerGradient}
                >
                    <SafeAreaView style={styles.headerContent}>
                        <View style={styles.topButtons}>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Ionicons name="arrow-back" size={28} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                                <Ionicons name={isEditing ? "close" : "create-outline"} size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.profileImageContainer}>
                            <TouchableOpacity onPress={isEditing ? pickImage : null} disabled={!isEditing}>
                                <View style={styles.imageWrapper}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.profileImage} />
                                    ) : (
                                        <View style={[styles.profileImage, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                                            <Ionicons name="person" size={60} color="#94a3b8" />
                                        </View>
                                    )}
                                    {isEditing && (
                                        <View style={styles.editIconBadge}>
                                            <Ionicons name="camera" size={20} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.userName}>{user?.name || "User Name"}</Text>
                            <Text style={styles.userRole}>{user?.role?.replace('_', ' ') || "Role"} • {user?.district || "Location"}</Text>
                            
                            {user?.role === 'trip_planner' && (
                                <TouchableOpacity 
                                    style={styles.planTripBtn}
                                    onPress={() => navigation.navigate('CreateTrip')}
                                >
                                    <Ionicons name="add-circle" size={20} color="#fff" />
                                    <Text style={styles.planTripBtnText}>Plan a Trip</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.contentContainer}>
                    {/* My Trips Section */}
                    {myTrips.length > 0 && (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {user?.role === 'main_buyer' ? "My Purchases" : "My Trips"}
                            </Text>
                            <TouchableOpacity onPress={fetchMyTrips}>
                                <Ionicons name="refresh" size={20} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                    )}

                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripsScroll}>
                        {myTrips.map((trip) => (
                            <TouchableOpacity 
                                key={trip._id} 
                                style={styles.tripMiniCard}
                                onPress={() => navigation.navigate('ManageTrip', { tripId: trip._id })}
                            >
                                <View style={styles.tripDateBox}>
                                    <Text style={styles.tripDateDay}>{new Date(trip.departureTime).getDate()}</Text>
                                    <Text style={styles.tripDateMonth}>{new Date(trip.departureTime).toLocaleString('default', { month: 'short' })}</Text>
                                </View>
                                <View style={styles.tripMiniInfo}>
                                    <Text style={styles.tripVesselName} numberOfLines={1}>{trip.vesselId?.name || "Vessel"}</Text>
                                    <Text style={styles.tripCrewStatus}>{trip.crew?.length || 0} / {trip.maxFishermen} Crew</Text>
                                </View>
                                <View style={styles.manageBtnSmall}>
                                    <Ionicons name="eye" size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Earnings Summary Card */}
                    <TouchableOpacity 
                        style={styles.earningsSummaryCard}
                        onPress={() => navigation.navigate('Earnings')}
                    >
                        <LinearGradient
                            colors={['#16a34a', '#15803d']}
                            style={styles.earningsGradient}
                        >
                            <View style={styles.earningsHeader}>
                                <View style={styles.earningsIconBg}>
                                    <Ionicons name="wallet" size={24} color="#16a34a" />
                                </View>
                                <Text style={styles.earningsTitle}>Financial Center</Text>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                            </View>
                            <View style={styles.earningsBody}>
                                <Text style={styles.earningsLabel}>Ready to Withdraw / Total</Text>
                                <Text style={styles.earningsAmount}>LKR {totalEarnings?.toLocaleString() || '0'}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Info Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Personal Information</Text>
                        
                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="person-outline" size={22} color="#2563eb" />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Full Name</Text>
                                {isEditing ? (
                                    <TextInput style={styles.input} value={name} onChangeText={setName} />
                                ) : (
                                    <Text style={styles.infoValue}>{name}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="call-outline" size={22} color="#2563eb" />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                {isEditing ? (
                                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                                ) : (
                                    <Text style={styles.infoValue}>{phone}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconBox}>
                                <Ionicons name="location-outline" size={22} color="#2563eb" />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Address</Text>
                                {isEditing ? (
                                    <TextInput style={styles.input} value={address} onChangeText={setAddress} />
                                ) : (
                                    <Text style={styles.infoValue}>{address}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Location Map */}
                    <View style={styles.mapCard}>
                        <Text style={styles.cardTitle}>Your Location</Text>
                        {address ? (
                            <MapComponent address1={address} />
                        ) : (
                            <View style={styles.noAddressContainer}>
                                <Ionicons name="map-outline" size={40} color="#94a3b8" />
                                <Text style={styles.noAddressText}>Update your address to see it on map</Text>
                            </View>
                        )}
                        <Text style={styles.mapHint}>Map generated using OpenStreetMap (Free)</Text>
                    </View>


                    {isEditing && (
                        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                            <LinearGradient
                                colors={['#2563eb', '#1d4ed8']}
                                style={styles.saveButtonGradient}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                        <Text style={styles.logoutText}>Logout from Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingBottom: 40,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        paddingHorizontal: 24,
    },
    topButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    imageWrapper: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#2563eb',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginTop: 16,
    },
    userRole: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    planTripBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    planTripBtnText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 8,
    },
    contentContainer: {
        padding: 24,
        marginTop: -20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    tripsScroll: {
        marginBottom: 24,
    },
    tripMiniCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 20,
        marginRight: 15,
        width: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    tripDateBox: {
        backgroundColor: '#eff6ff',
        padding: 8,
        borderRadius: 12,
        alignItems: 'center',
        width: 45,
    },
    tripDateDay: {
        fontSize: 16,
        fontWeight: '800',
        color: '#2563eb',
    },
    tripDateMonth: {
        fontSize: 10,
        fontWeight: '700',
        color: '#2563eb',
        textTransform: 'uppercase',
    },
    tripMiniInfo: {
        flex: 1,
        marginLeft: 12,
    },
    tripVesselName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
    },
    tripCrewStatus: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    manageBtnSmall: {
        width: 32,
        height: 32,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 20,
    },
    mapCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    mapHint: {
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 10,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBox: {
        width: 44,
        height: 44,
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '700',
    },
    input: {
        fontSize: 16,
        color: '#2563eb',
        fontWeight: '700',
        borderBottomWidth: 1,
        borderBottomColor: '#2563eb',
        paddingVertical: 2,
    },
    saveButton: {
        marginBottom: 20,
    },
    saveButtonGradient: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: '#fff1f2',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
        gap: 10,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
    noAddressContainer: {
        height: 200,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    noAddressText: {
        marginTop: 10,
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },
    earningsSummaryCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 8,
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    earningsGradient: {
        padding: 20,
    },
    earningsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    earningsIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    earningsTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    earningsBody: {
        marginTop: 5,
    },
    earningsLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    earningsAmount: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginTop: 4,
    }
});


export default ProfileScreen;
