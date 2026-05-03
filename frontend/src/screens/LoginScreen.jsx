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
    ActivityIndicator
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

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const response = await client.post('/api/users/login', {
                email,
                password
            });
            
            const userData = response.data;
            
            // Save token and user data
            await AsyncStorage.setItem('userToken', userData.token);
            await AsyncStorage.setItem('userData', JSON.stringify(userData));

            console.log("Token Saved Successfully");
            
            // Navigate to Home
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
            <LinearGradient
                colors={['#0f172a', '#1e3a8a']}
                style={styles.gradientHeader}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Log in to your Smart Marine account</Text>
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
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>

                            <TouchableOpacity style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleLogin} activeOpacity={0.9} style={styles.buttonContainer} disabled={loading}>
                                <LinearGradient
                                    colors={['#2563eb', '#1d4ed8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.button, loading && { opacity: 0.7 }]}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>Log In</Text>
                                            <Ionicons name="log-in-outline" size={22} color="#fff" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Don't have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={styles.registerText}>Sign Up</Text>
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
        height: height * 0.3,
        width: '100%',
    },
    safeArea: {
        flex: 1,
    },
    headerTextContainer: {
        paddingHorizontal: 24,
        paddingTop: 40,
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
        marginTop: -60,
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
    forgotPassword: {
        alignItems: 'flex-end',
        marginBottom: 24,
        paddingRight: 4,
    },
    forgotPasswordText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '700',
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
    registerText: {
        color: '#2563eb',
        fontWeight: '800',
        fontSize: 14,
    },
});

export default LoginScreen;
