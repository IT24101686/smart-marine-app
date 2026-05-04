import React, { useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ImageBackground, 
    TouchableOpacity, 
    Dimensions, 
    Animated,
    StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 1200,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <ImageBackground 
                source={require('../../assets/malu_kade_welcome_bg.png')} 
                style={styles.background}
            >
                <LinearGradient
                    colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.95)']}
                    style={styles.gradient}
                >
                    <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="boat" size={50} color="#fff" />
                        </View>
                        
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleMain}>මාළු කඩේ</Text>
                            <View style={styles.vineDecoration}>
                                <View style={styles.vineLine} />
                                <Ionicons name="leaf" size={16} color="#fbbf24" />
                                <View style={styles.vineLine} />
                            </View>
                            <Text style={styles.titleSub}>MALU KADE</Text>
                        </View>

                        <Text style={styles.tagline}>
                            Freshness from the Deep Ocean{"\n"}Directly to Your Doorstep
                        </Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity 
                                style={styles.primaryBtn}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <LinearGradient
                                    colors={['#2563eb', '#1e40af']}
                                    style={styles.btnGradient}
                                >
                                    <Text style={styles.btnText}>Get Started</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.secondaryBtn}
                                onPress={() => navigation.navigate('Register')}
                            >
                                <Text style={styles.secondaryBtnText}>Create an Account</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.footerText}>
                            Experience the true taste of the sea
                        </Text>
                    </Animated.View>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        width: width,
        height: height,
    },
    gradient: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 60,
        paddingHorizontal: 30,
    },
    content: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 20,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    titleMain: {
        fontSize: 56,
        fontWeight: '900',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
        letterSpacing: 2,
    },
    vineDecoration: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginVertical: -5,
    },
    vineLine: {
        width: 60,
        height: 1.5,
        backgroundColor: '#fbbf24',
        borderRadius: 1,
    },
    titleSub: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fbbf24',
        letterSpacing: 8,
        marginTop: 5,
        textTransform: 'uppercase',
    },
    tagline: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 50,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    primaryBtn: {
        width: '100%',
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    btnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    secondaryBtn: {
        width: '100%',
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    secondaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 40,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    }
});

export default WelcomeScreen;
