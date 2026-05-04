import React, { useState, useEffect } from 'react';
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
    Image,
    Animated,
    ImageBackground,
    ActivityIndicator
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
    const [loading, setLoading] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    }, []);

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
        if (!result.canceled) setImage(result.assets[0].uri);
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

        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: 'customer', label: 'Customer', icon: 'person' },
        { id: 'seller', label: 'Seller', icon: 'cart' },
        { id: 'fisherman', label: 'Fisherman', icon: 'people' },
        { id: 'boat_owner', label: 'Boat Owner', icon: 'boat' },
        { id: 'trip_planner', label: 'Businessman', icon: 'business' },
        { id: 'main_buyer', label: 'Main Buyer', icon: 'pricetag' }
    ];

    return (
        <View style={styles.container}>
            <ImageBackground 
                source={require('../../assets/malu_kade_welcome_bg.png')} 
                style={styles.background}
            >
                <LinearGradient
                    colors={['rgba(15, 23, 42, 0.7)', 'rgba(15, 23, 42, 0.95)']}
                    style={styles.gradient}
                >
                    <SafeAreaView style={styles.safeArea}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                        <Ionicons name="arrow-back" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.titleMain}>මාළු කඩේ</Text>
                                    <Text style={styles.subtitle}>Join our marine community</Text>
                                </Animated.View>

                                <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                                    <View style={styles.imagePickerContainer}>
                                        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                                            {image ? (
                                                <Image source={{ uri: image }} style={styles.profileImage} />
                                            ) : (
                                                <View style={styles.imagePlaceholder}>
                                                    <Ionicons name="camera" size={30} color="#fff" />
                                                    <Text style={styles.imagePlaceholderText}>Profile</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.sectionLabel}>Select Your Role</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
                                        {roles.map((r) => (
                                            <TouchableOpacity
                                                key={r.id}
                                                style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
                                                onPress={() => setRole(r.id)}
                                            >
                                                <Ionicons name={r.icon} size={18} color={role === r.id ? '#fff' : 'rgba(255,255,255,0.6)'} />
                                                <Text style={[styles.roleBtnText, role === r.id && styles.roleBtnTextActive]}>{r.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Full Name</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="rgba(255,255,255,0.4)" value={name} onChangeText={setName} />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Email Address</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Phone Number</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>District</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <Picker selectedValue={district} onValueChange={setDistrict} style={styles.picker} dropdownIconColor="#fff">
                                                {districts.map(d => <Picker.Item key={d} label={d} value={d} />)}
                                            </Picker>
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Full Address</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="home-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="Address" placeholderTextColor="rgba(255,255,255,0.4)" value={address} onChangeText={setAddress} />
                                        </View>
                                    </View>

                                    {role === 'boat_owner' && (
                                        <>
                                            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Boat Name</Text><View style={styles.inputWrapper}><Ionicons name="boat-outline" size={20} color="rgba(255,255,255,0.6)" /><TextInput style={styles.input} placeholder="Boat Name" placeholderTextColor="rgba(255,255,255,0.4)" value={boatName} onChangeText={setBoatName} /></View></View>
                                            <View style={styles.inputGroup}><Text style={styles.inputLabel}>License Number</Text><View style={styles.inputWrapper}><Ionicons name="document-text-outline" size={20} color="rgba(255,255,255,0.6)" /><TextInput style={styles.input} placeholder="License" placeholderTextColor="rgba(255,255,255,0.4)" value={boatLicense} onChangeText={setBoatLicense} /></View></View>
                                        </>
                                    )}

                                    {role === 'seller' && (
                                        <>
                                            <View style={styles.inputGroup}><Text style={styles.inputLabel}>Shop Name</Text><View style={styles.inputWrapper}><Ionicons name="business-outline" size={20} color="rgba(255,255,255,0.6)" /><TextInput style={styles.input} placeholder="Shop Name" placeholderTextColor="rgba(255,255,255,0.4)" value={shopName} onChangeText={setShopName} /></View></View>
                                        </>
                                    )}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#fff" /></TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Confirm Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
                                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}><Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#fff" /></TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity onPress={handleRegister} activeOpacity={0.9} style={styles.registerBtn} disabled={loading}>
                                        <LinearGradient colors={['#2563eb', '#1e40af']} style={styles.btnGradient}>
                                            {loading ? <ActivityIndicator color="#fff" /> : (
                                                <><Text style={styles.btnText}>Create Account</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>

                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>Already have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.loginText}>Login</Text></TouchableOpacity>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    background: { width, height },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
    header: { alignItems: 'center', marginBottom: 30 },
    backBtn: { position: 'absolute', left: 0, top: 10, width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    titleMain: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '600' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    imagePickerContainer: { alignItems: 'center', marginBottom: 25 },
    imagePicker: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    profileImage: { width: '100%', height: '100%', borderRadius: 40 },
    imagePlaceholder: { alignItems: 'center' },
    imagePlaceholderText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
    roleScroll: { flexDirection: 'row', marginBottom: 25 },
    roleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 8 },
    roleBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    roleBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
    roleBtnTextActive: { color: '#fff' },
    inputGroup: { marginBottom: 18 },
    inputLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
    inputWrapper: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.4)', 
        borderRadius: 18, 
        paddingHorizontal: 16, 
        height: 56, 
        borderWidth: 1.5, 
        borderColor: 'rgba(255, 255, 255, 0.3)' 
    },
    input: { 
        flex: 1, 
        marginLeft: 12, 
        color: '#ffffff', 
        fontSize: 15, 
        fontWeight: '700',
        height: 56
    },
    picker: { flex: 1, color: '#fff' },
    registerBtn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 10, elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
    btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    footerText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, fontWeight: '600' },
    loginText: { color: '#fff', fontWeight: '900', fontSize: 14, textDecorationLine: 'underline' }
});

export default RegisterScreen;
