import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform,
    ScrollView,
    Dimensions,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import client from '../api/client';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [district, setDistrict] = useState('Galle');
    const [address, setAddress] = useState('');
    const [role, setRole] = useState('customer');
    const [boatName, setBoatName] = useState('');
    const [boatLicense, setBoatLicense] = useState('');
    const [shopName, setShopName] = useState('');
    const [shopAddress, setShopAddress] = useState('');
    const [image, setImage] = useState(null);
    const [boatImages, setBoatImages] = useState([]);
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const districts = [
        "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", 
        "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar", 
        "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee", 
        "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla", 
        "Moneragala", "Ratnapura", "Kegalle"
    ];

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const pickBoatImages = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            const newImages = result.assets.map(asset => asset.uri);
            setBoatImages([...boatImages, ...newImages]);
        }
    };

    const removeBoatImage = (index) => {
        const filteredImages = boatImages.filter((_, i) => i !== index);
        setBoatImages(filteredImages);
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword || !phone || !district || !address) {
            Alert.alert("Error", "Please fill all required fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match!");
            return;
        }

        try {
            await client.post('/api/users/register', {
                name, email, password, phone, role, district, address,
                boatName, boatLicense, shopName, shopAddress,
                profileImage: image,
                boatPhotos: boatImages
            });
            Alert.alert("Success", "Account created successfully!");
            navigation.navigate('Login');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Something went wrong");
        }
    };

    const roles = [
        { id: 'customer', label: 'Customer', icon: 'person' },
        { id: 'seller', label: 'Seller', icon: 'cart' },
        { id: 'fisherman', label: 'Crew / Fisherman', icon: 'people' },
        { id: 'boat_owner', label: 'Boat Owner', icon: 'boat' },
        { id: 'trip_planner', label: 'Businessman', icon: 'business' },
        { id: 'main_buyer', label: 'Main Buyer', icon: 'pricetag' }
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f172a', '#1e3a8a']}
                style={styles.gradientHeader}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title}>Smart Marine</Text>
                        <Text style={styles.subtitle}>Join the future of marine commerce</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.formWrapper}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.card}>
                            <View style={styles.imagePickerContainer}>
                                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.profileImage} />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="camera" size={40} color="#94a3b8" />
                                            <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionLabel}>Register As</Text>
                            <View style={styles.roleContainer}>
                                {roles.map((r) => (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[
                                            styles.roleButton,
                                            role === r.id && styles.roleButtonActive
                                        ]}
                                        onPress={() => setRole(r.id)}
                                    >
                                        <Ionicons 
                                            name={r.icon} 
                                            size={20} 
                                            color={role === r.id ? '#ffffff' : '#64748b'} 
                                        />
                                        <Text style={[
                                            styles.roleButtonText,
                                            role === r.id && styles.roleButtonTextActive
                                        ]}>
                                            {r.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    placeholderTextColor="#94a3b8"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Address"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>

                            <Text style={styles.sectionLabel}>Select District</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="location-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <Picker
                                    selectedValue={district}
                                    onValueChange={(itemValue) => setDistrict(itemValue)}
                                    style={styles.picker}
                                >
                                    {districts.map((d) => (
                                        <Picker.Item key={d} label={d} value={d} />
                                    ))}
                                </Picker>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="home-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Address"
                                    placeholderTextColor="#94a3b8"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>

                            {role === 'boat_owner' && (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="boat-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Boat Name"
                                            placeholderTextColor="#94a3b8"
                                            value={boatName}
                                            onChangeText={setBoatName}
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="document-text-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Boat License Number"
                                            placeholderTextColor="#94a3b8"
                                            value={boatLicense}
                                            onChangeText={setBoatLicense}
                                        />
                                    </View>

                                    {/* Boat Photos Section */}
                                    <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Boat Photos</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boatImagesScroll}>
                                        {boatImages.map((uri, index) => (
                                            <View key={index} style={styles.boatImageWrapper}>
                                                <Image source={{ uri }} style={styles.boatImagePreview} />
                                                <TouchableOpacity 
                                                    style={styles.removeImageBadge} 
                                                    onPress={() => removeBoatImage(index)}
                                                >
                                                    <Ionicons name="close" size={14} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity style={styles.addBoatImageButton} onPress={pickBoatImages}>
                                            <Ionicons name="add" size={30} color="#94a3b8" />
                                            <Text style={styles.addPhotoText}>Add</Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </>
                            )}

                            {role === 'seller' && (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="business-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Shop Name"
                                            placeholderTextColor="#94a3b8"
                                            value={shopName}
                                            onChangeText={setShopName}
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="map-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Shop Address"
                                            placeholderTextColor="#94a3b8"
                                            value={shopAddress}
                                            onChangeText={setShopAddress}
                                        />
                                    </View>
                                </>
                            )}

                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={handleRegister} activeOpacity={0.9} style={styles.buttonContainer}>

                                <LinearGradient
                                    colors={['#2563eb', '#1d4ed8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>Create Account</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginText}>Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    gradientHeader: {
        height: height * 0.25,
        width: '100%',
    },
    safeArea: {
        flex: 1,
    },
    headerTextContainer: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    formWrapper: {
        flex: 1,
        marginTop: -40,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
        marginTop: 4,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    boatImagesScroll: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    boatImageWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    boatImagePreview: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
    },
    removeImageBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#ef4444',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    addBoatImageButton: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    addPhotoText: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 4,
    },
    roleButtonActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    roleButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
    },
    roleButtonTextActive: {
        color: '#ffffff',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '500',
    },
    picker: {
        flex: 1,
        color: '#1e293b',
    },
    buttonContainer: {

        marginTop: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '800',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
    },
    loginText: {
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 14,
    },
});

export default RegisterScreen;
