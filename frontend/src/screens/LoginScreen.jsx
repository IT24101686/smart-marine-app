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
    ActivityIndicator,
    Animated,
    ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
        ]).start();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const response = await client.post('/api/users/login', { email, password });
            const userData = response.data;
            await AsyncStorage.setItem('userToken', userData.token);
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            navigation.replace('Home');
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

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
                        <KeyboardAvoidingView 
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ flex: 1 }}
                        >
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                                    <View style={styles.logoCircle}>
                                        <Ionicons name="boat" size={40} color="#fff" />
                                    </View>
                                    <Text style={styles.titleMain}>මාළු කඩේ</Text>
                                    <Text style={styles.subtitle}>Welcome back to the ocean hub</Text>
                                </Animated.View>

                                <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                                    <Text style={styles.cardTitle}>Login</Text>
                                    
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Email Address</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter your email"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                value={email}
                                                onChangeText={setEmail}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="••••••••"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                secureTextEntry
                                                value={password}
                                                onChangeText={setPassword}
                                            />
                                        </View>
                                    </View>

                                    <TouchableOpacity style={styles.forgotBtn}>
                                        <Text style={styles.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        onPress={handleLogin} 
                                        activeOpacity={0.9} 
                                        style={styles.loginBtn}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#2563eb', '#1e40af']}
                                            style={styles.btnGradient}
                                        >
                                            {loading ? <ActivityIndicator color="#fff" /> : (
                                                <>
                                                    <Text style={styles.btnText}>Login Now</Text>
                                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>

                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>Don't have an account? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                        <Text style={styles.registerText}>Sign Up</Text>
                                    </TouchableOpacity>
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
    scrollContent: { paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 15,
    },
    titleMain: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 5,
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 32,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 25,
    },
    inputGroup: { marginBottom: 20 },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker solid-like background
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 60,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    input: {
        flex: 1,
        marginLeft: 12,
        color: '#ffffff', // Force pure white
        fontSize: 16,
        fontWeight: '700',
        height: 60, // Explicit height to match wrapper
    },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 30 },
    forgotText: { color: '#fbbf24', fontSize: 14, fontWeight: '700' },
    loginBtn: {
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 15, fontWeight: '600' },
    registerText: { color: '#fff', fontWeight: '900', fontSize: 15, textDecorationLine: 'underline' },
});

export default LoginScreen;
