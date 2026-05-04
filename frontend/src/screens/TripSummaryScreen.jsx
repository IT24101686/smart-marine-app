import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const fmt = (n) => {
    if (n == null || isNaN(n)) return '0';
    return Math.round(n).toLocaleString();
};
const fmtKg = (n) => (n == null ? '0' : Number(n).toFixed(1));

const TripSummaryScreen = ({ route, navigation }) => {
    const { tripId } = route.params;
    const [summary, setSummary] = useState(null);
    const [finances, setFinances] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tripReviews, setTripReviews] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [myReview, setMyReview] = useState(null);

    useEffect(() => {
        loadAll();
    }, [tripId]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const userData = await AsyncStorage.getItem('userData');
            let user = null;
            if (userData) {
                user = JSON.parse(userData);
                setCurrentUser(user);
            }

            const [sumRes, finRes] = await Promise.all([
                client.get(`/api/trips/${tripId}/summary`),
                client.get(`/api/trips/${tripId}/finances`),
            ]);
            setSummary(sumRes.data);
            setFinances(finRes.data);

            if (sumRes.data?.crew) {
                const reviewsPromises = sumRes.data.crew.map(m => client.get(`/api/reviews/${m._id}`));
                const reviewsResults = await Promise.all(reviewsPromises);
                const allReviews = reviewsResults.flatMap(r => r.data).filter(r => r.tripId === tripId);
                setTripReviews(allReviews);

                // Check if current user (if crew) has reviewed
                const myRev = allReviews.find(r => r.reviewerId?._id === user?._id);
                if (myRev) {
                    setHasReviewed(true);
                    setMyReview(myRev);
                } else {
                    setHasReviewed(false);
                    setMyReview(null);
                }
            }
        } catch (error) {
            console.error('TripSummary load error:', error);
            Alert.alert('Error', 'Could not load trip data');
        } finally {
            setLoading(false);
        }
    };

    const handleSellGradeC = () => {
        Alert.prompt(
            'Sell Grade C Stock',
            'Enter total revenue received from dry fish / industrial buyers (LKR):',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Record Sale',
                    onPress: async (revenue) => {
                        try {
                            await client.post(`/api/trips/${tripId}/sell-grade-c`, {
                                revenue: parseFloat(revenue) || 0,
                            });
                            Alert.alert('Success', 'Grade C sale recorded!');
                            loadAll();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to record sale');
                        }
                    },
                },
            ],
            'plain-text',
            '5000'
        );
    };

    const handleRateCrew = (crewMember) => {
        Alert.alert(
            `Rate ${crewMember.name}`,
            'How was their performance on this trip?',
            [
                { text: '1 ⭐', onPress: () => submitRating(crewMember, 1) },
                { text: '2 ⭐', onPress: () => submitRating(crewMember, 2) },
                { text: '3 ⭐', onPress: () => submitRating(crewMember, 3) },
                { text: '4 ⭐', onPress: () => submitRating(crewMember, 4) },
                { text: '5 ⭐', onPress: () => submitRating(crewMember, 5) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const submitRating = async (crewMember, stars) => {
        Alert.prompt(
            'Add a comment (Optional)',
            `Provide a brief feedback for ${crewMember.name}`,
            async (comment) => {
                try {
                    await client.post(`/api/reviews`, {
                        targetUserId: crewMember._id,
                        tripId: tripId,
                        rating: stars,
                        comment: comment || 'Good work'
                    });
                    Alert.alert('Success 🎉', 'Review submitted successfully!');
                    loadAll();
                } catch (e) {
                    console.error("Review submit error:", e);
                    Alert.alert('Error', 'Failed to submit review');
                }
            }
        );
    };

    const handleDeleteReview = async (reviewId) => {
        Alert.alert(
            "Delete Review",
            "Are you sure you want to remove this review?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await client.delete(`/api/reviews/${reviewId}`);
                            Alert.alert("Success", "Review deleted");
                            loadAll();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete review");
                        }
                    }
                }
            ]
        );
    };

    const handleRateTrip = () => {
        Alert.alert(
            'Rate this Trip Experience',
            'How was the planning and coordination of this trip?',
            [
                { text: '1 ⭐', onPress: () => submitTripReview(1) },
                { text: '2 ⭐', onPress: () => submitTripReview(2) },
                { text: '3 ⭐', onPress: () => submitTripReview(3) },
                { text: '4 ⭐', onPress: () => submitTripReview(4) },
                { text: '5 ⭐', onPress: () => submitTripReview(5) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const submitTripReview = async (stars) => {
        Alert.prompt(
            'Trip Feedback',
            'Share your thoughts on the planner and the overall journey:',
            async (comment) => {
                try {
                    await client.post(`/api/reviews`, {
                        targetUserId: summary.plannerId?._id || summary.plannerId,
                        tripId: tripId,
                        rating: stars,
                        comment: comment || 'Great experience',
                        type: 'trip_rating'
                    });
                    Alert.alert('Thank you! ❤️', 'Your feedback helps improve the community.');
                    loadAll();
                } catch (e) {
                    Alert.alert('Error', 'Failed to submit review');
                }
            }
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Generating Trip Statement…</Text>
            </View>
        );
    }

    const isSold = summary?.status === 'sold';
    const totalWeight = summary?.totalWeight || 0;
    const gradeAWeight = summary?.supermarketStock || 0;
    const gradeBWeight = summary?.customerStock || 0;
    const gradeCWeight = summary?.wasteProduct || 0;
    const catchCount = summary?.catchCount || 0;

    const totalCosts = finances?.totalCosts || 0;
    const displayRev = isSold ? (finances?.actualRevenue || 0) : (finances?.estimatedRevenue || 0);
    const netProfit = displayRev - totalCosts;
    const gradeCRevenue = finances?.gradeCRevenue || 0;

    const ownerPct = finances?.commissions?.owner ?? 40;
    const plannerPct = finances?.commissions?.planner ?? 10;
    const crewPct = finances?.commissions?.crew ?? 50;

    const ownerCut = Math.max(0, netProfit * ownerPct / 100);
    const plannerCut = Math.max(0, netProfit * plannerPct / 100);
    const crewTotal = Math.max(0, netProfit * crewPct / 100);
    const crewCount = finances?.breakdown?.crewCount || summary?.crew?.length || 1;
    const crewPer = crewTotal / crewCount;

    const costs = finances?.costs || {};
    const fishPrices = finances?.fishPrices || [];

    // Check if current user is part of the crew
    const isCrewMember = summary?.crew?.some(m => m._id === currentUser?._id);
    const myPayout = isCrewMember ? crewPer : 0;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isSold ? ['#065f46', '#047857'] : ['#1e3a8a', '#1e40af']}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {isSold ? 'Final Trip Statement' : 'Trip Summary & Estimates'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={styles.statusPill}>
                        <Ionicons name={isSold ? 'checkmark-done-circle' : 'timer-outline'} size={14} color="#fff" />
                        <Text style={styles.statusPillText}>
                            {isSold ? 'SOLD' : summary?.status === 'completed' ? 'AWAITING BUYER' : summary?.status?.toUpperCase()}
                        </Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {isCrewMember && (
                    <LinearGradient
                        colors={['#10b981', '#059669']}
                        style={styles.myPayoutCard}
                    >
                        <View style={styles.payoutHeader}>
                            <Ionicons name="wallet-outline" size={24} color="#fff" />
                            <Text style={styles.payoutTitle}>My Personal Payout</Text>
                        </View>
                        <Text style={styles.payoutAmount}>LKR {fmt(myPayout)}</Text>
                        <Text style={styles.payoutSub}>
                            {isSold ? 'This amount has been finalized.' : 'Estimated based on current market rates.'}
                        </Text>
                    </LinearGradient>
                )}

                <View style={styles.card}>
                    <SectionHeader icon="stats-chart-outline" title="Catch Overview" />
                    <View style={styles.statsRow}>
                        <StatBox label="Total Catches" value={catchCount} unit="" />
                        <StatBox label="Total Weight" value={fmtKg(totalWeight)} unit="kg" />
                    </View>
                    <View style={[styles.statsRow, { marginTop: 10 }]}>
                        <StatBox label="Grade A 🟢" value={fmtKg(gradeAWeight)} unit="kg" color="#16a34a" />
                        <StatBox label="Grade B 🟡" value={fmtKg(gradeBWeight)} unit="kg" color="#ca8a04" />
                        <StatBox label="Grade C 🔴" value={fmtKg(gradeCWeight)} unit="kg" color="#dc2626" />
                    </View>
                </View>

                {summary?.catchBreakdownDetails && Object.keys(summary.catchBreakdownDetails).length > 0 && (
                    <View style={styles.card}>
                        <SectionHeader icon="fish-outline" title="Catch Breakdown by Type" />
                        {Object.entries(summary.catchBreakdownDetails).map(([fish, w]) => {
                            const priceEntry = fishPrices.find(p => p.fishType === fish);
                            const pricePerKg = priceEntry?.pricePerKg || 0;
                            const sellableKg = (w.gradeA || 0) + (w.gradeB || 0);
                            const est = sellableKg * pricePerKg;
                            return (
                                <View key={fish} style={styles.fishRow}>
                                    <View style={styles.fishRowLeft}>
                                        <Text style={styles.fishName}>{fish}</Text>
                                        <View style={styles.gradeRow}>
                                            {w.gradeA > 0 && <GradePill label={`A: ${fmtKg(w.gradeA)} kg`} color="#dcfce7" textColor="#166534" />}
                                            {w.gradeB > 0 && <GradePill label={`B: ${fmtKg(w.gradeB)} kg`} color="#fef9c3" textColor="#854d0e" />}
                                            {w.gradeC > 0 && <GradePill label={`C: ${fmtKg(w.gradeC)} kg`} color="#fee2e2" textColor="#991b1b" />}
                                        </View>
                                        {pricePerKg > 0 && (
                                            <Text style={styles.fishPriceNote}>
                                                LKR {fmt(pricePerKg)}/kg → Est. LKR {fmt(est)}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.fishTotal}>{fmtKg((w.gradeA||0)+(w.gradeB||0)+(w.gradeC||0))} kg</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {gradeCWeight > 0 && (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
                        <SectionHeader icon="trash-outline" title="Grade C — Dry Fish / Industrial" iconColor="#f59e0b" />
                        <Text style={styles.infoText}>Stock: {fmtKg(gradeCWeight)} kg</Text>
                        {gradeCRevenue > 0 ? (
                            <View style={styles.soldBadge}>
                                <Ionicons name="checkmark-done" size={16} color="#166534" />
                                <Text style={styles.soldBadgeText}>Sold for LKR {fmt(gradeCRevenue)}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.sellBtn} onPress={handleSellGradeC}>
                                <Text style={styles.sellBtnText}>Record Grade C Sale</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={styles.card}>
                    <SectionHeader icon="receipt-outline" title="Trip Costs" />
                    <CostRow label="⛽ Fuel" value={costs.fuel || 0} />
                    <CostRow label="🍱 Food" value={costs.food || 0} />
                    <CostRow label="🎣 Bait" value={costs.bait || 0} />
                    <CostRow label="📦 Other" value={costs.other || 0} />
                    <View style={styles.divider} />
                    <View style={styles.costTotalRow}>
                        <Text style={styles.costTotalLabel}>Total Costs</Text>
                        <Text style={styles.costTotalValue}>LKR {fmt(totalCosts)}</Text>
                    </View>
                </View>

                <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#2563eb' }]}>
                    <View style={styles.sectionHeaderRow}>
                        <SectionHeader icon="cash-outline" title={isSold ? 'Finalized Financials' : 'Estimated Financials'} />
                        {!isSold && (
                            <View style={styles.estimateBadge}>
                                <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>{isSold ? 'Sale Revenue' : 'Estimated Revenue'}</Text>
                        <Text style={[styles.finValue, { color: '#16a34a' }]}>+ LKR {fmt(displayRev)}</Text>
                    </View>
                    {gradeCRevenue > 0 && (
                        <View style={styles.finRow}>
                            <Text style={styles.finSubLabel}>  incl. Grade C sale</Text>
                            <Text style={styles.finSubValue}>LKR {fmt(gradeCRevenue)}</Text>
                        </View>
                    )}
                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>Total Costs</Text>
                        <Text style={[styles.finValue, { color: '#dc2626' }]}>− LKR {fmt(totalCosts)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.finRow}>
                        <Text style={styles.profitLabel}>{isSold ? 'Net Profit' : 'Projected Profit'}</Text>
                        <Text style={[styles.profitValue, { color: netProfit >= 0 ? '#2563eb' : '#dc2626' }]}>LKR {fmt(netProfit)}</Text>
                    </View>

                    <Text style={styles.subTitle}>Earnings Distribution</Text>
                    <View style={styles.distGrid}>
                        <DistCard label={`Boat Owner (${ownerPct}%)`} value={ownerCut} color="#7c3aed" icon="boat-outline" />
                        <DistCard label={`Trip Planner (${plannerPct}%)`} value={plannerCut} color="#2563eb" icon="map-outline" />
                        <View style={[styles.distCard, { width: '100%', backgroundColor: '#f0fdf4' }]}>
                            <View style={styles.distCardRow}>
                                <Ionicons name="people-outline" size={18} color="#16a34a" />
                                <Text style={[styles.distLabel, { color: '#16a34a' }]}>Crew Share ({crewPct}%) — {crewCount} fishermen</Text>
                            </View>
                            <Text style={styles.distAmount}>LKR {fmt(crewTotal)} total</Text>
                            <Text style={styles.distPerPerson}>≈ LKR {fmt(crewPer)} per person</Text>
                        </View>
                    </View>
                </View>

                {summary?.crew && summary.crew.length > 0 && (
                    <View style={styles.card}>
                        <SectionHeader icon="people-outline" title="Crew Members Performance" />
                        {summary.crew.map((m, i) => {
                            const existingReview = tripReviews.find(r => r.targetUserId === m._id);
                            return (
                                <View key={m._id || i} style={styles.crewRow}>
                                    <Ionicons name="person-circle-outline" size={32} color="#2563eb" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.crewName}>{m.name}</Text>
                                        <Text style={styles.crewSub}>{m.district || 'N/A'}</Text>
                                        {existingReview && (
                                            <View style={styles.ratingBadge}>
                                                <Ionicons name="star" size={12} color="#fbbf24" />
                                                <Text style={styles.ratingBadgeText}>{existingReview.rating} Stars</Text>
                                                <Text style={styles.reviewCommentSmall} numberOfLines={1}> - "{existingReview.comment}"</Text>
                                            </View>
                                        )}
                                    </View>
                                    {!existingReview ? (
                                        <TouchableOpacity style={styles.rateBtn} onPress={() => handleRateCrew(m)}>
                                            <Ionicons name="star-outline" size={16} color="#fff" />
                                            <Text style={styles.rateBtnText}>Rate</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={styles.reviewActions}>
                                            {existingReview.reviewerId?._id === currentUser?._id && (
                                                <TouchableOpacity style={styles.deleteBtnSmall} onPress={() => handleDeleteReview(existingReview._id)}>
                                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            )}
                                            <Text style={styles.crewShare}>LKR {fmt(crewPer)}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {isCrewMember && (
                    <View style={styles.card}>
                        <SectionHeader icon="chatbubble-ellipses-outline" title="My Feedback" />
                        {hasReviewed ? (
                            <View style={styles.myReviewBox}>
                                <View style={styles.reviewHeaderRow}>
                                    <View style={styles.ratingBadge}>
                                        <Ionicons name="star" size={14} color="#fbbf24" />
                                        <Text style={styles.ratingBadgeText}>{myReview?.rating} Stars</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteReview(myReview._id)}>
                                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.myReviewComment}>"{myReview?.comment}"</Text>
                                <Text style={styles.myReviewDate}>Reviewed on {new Date(myReview?.createdAt).toLocaleDateString()}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.bigRateBtn} onPress={handleRateTrip}>
                                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.bigRateBtnGradient}>
                                    <Ionicons name="star" size={24} color="#fff" />
                                    <Text style={styles.bigRateBtnText}>Rate My Experience</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
                    <Ionicons name="home-outline" size={20} color="#fff" />
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const SectionHeader = ({ icon, title, iconColor = '#2563eb' }) => (
    <View style={styles.sectionHeaderRow}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);

const StatBox = ({ label, value, unit, color = '#1e293b' }) => (
    <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}{unit ? ` ${unit}` : ''}</Text>
    </View>
);

const GradePill = ({ label, color, textColor }) => (
    <View style={[styles.gradePill, { backgroundColor: color }]}>
        <Text style={[styles.gradePillText, { color: textColor }]}>{label}</Text>
    </View>
);

const CostRow = ({ label, value }) => (
    <View style={styles.costRow}>
        <Text style={styles.costLabel}>{label}</Text>
        <Text style={styles.costValue}>LKR {Math.round(value).toLocaleString()}</Text>
    </View>
);

const DistCard = ({ label, value, color, icon }) => (
    <View style={[styles.distCard, { backgroundColor: '#f8fafc' }]}>
        <View style={styles.distCardRow}>
            <Ionicons name={icon} size={16} color={color} />
            <Text style={[styles.distLabel, { color }]}>{label}</Text>
        </View>
        <Text style={styles.distAmount}>LKR {Math.round(value).toLocaleString()}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { paddingBottom: 16 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 8, marginBottom: 4 },
    statusPillText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
    scrollContent: { padding: 16, paddingBottom: 50 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 2 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 16, alignItems: 'center' },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    fishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 10 },
    fishRowLeft: { flex: 1, marginRight: 10 },
    fishName: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
    fishTotal: { fontSize: 16, fontWeight: '800', color: '#1e293b', alignSelf: 'center' },
    gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    gradePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    gradePillText: { fontSize: 11, fontWeight: '800' },
    fishPriceNote: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 4 },
    infoText: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 10 },
    soldBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#dcfce7', padding: 10, borderRadius: 10 },
    soldBadgeText: { color: '#166534', fontWeight: '700', fontSize: 13 },
    sellBtn: { backgroundColor: '#fef3c7', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fcd34d', marginTop: 4 },
    sellBtnText: { color: '#92400e', fontWeight: '800', fontSize: 14 },
    costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    costLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    costValue: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    costTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
    costTotalLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    costTotalValue: { fontSize: 15, fontWeight: '800', color: '#dc2626' },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    finLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    finValue: { fontSize: 15, fontWeight: '800' },
    finSubLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    finSubValue: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    profitLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    profitValue: { fontSize: 22, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
    estimateBadge: { backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fed7aa' },
    estimateBadgeText: { fontSize: 10, fontWeight: '800', color: '#c2410c' },
    subTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginTop: 14, marginBottom: 10 },
    distGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    distCard: { flex: 1, minWidth: '47%', padding: 14, borderRadius: 14 },
    distCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    distLabel: { fontSize: 11, fontWeight: '700', flex: 1 },
    distAmount: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginTop: 2 },
    distPerPerson: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 2 },
    crewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 8 },
    crewName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    crewSub: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    crewShare: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
    rateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbbf24', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 4 },
    rateBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    ratingBadgeText: { color: '#92400e', fontSize: 10, fontWeight: '800' },
    reviewCommentSmall: { color: '#64748b', fontSize: 10, fontStyle: 'italic', flex: 1 },
    reviewActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    deleteBtnSmall: { padding: 4 },
    homeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 20, marginTop: 6 },
    homeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#64748b', fontWeight: '600' },
    // My Payout Card
    myPayoutCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    payoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8
    },
    payoutTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 16,
        fontWeight: '700'
    },
    payoutAmount: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '900',
    },
    payoutSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic'
    },
    // Review Styles
    bigRateBtn: {
        marginTop: 10,
        borderRadius: 16,
        overflow: 'hidden'
    },
    bigRateBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12
    },
    bigRateBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800'
    },
    myReviewBox: {
        backgroundColor: '#f8fafc',
        padding: 20,
        borderRadius: 16,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    myReviewComment: {
        fontSize: 16,
        color: '#334155',
        fontStyle: 'italic',
        marginTop: 12,
        lineHeight: 24
    },
    myReviewDate: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 12,
        fontWeight: '600'
    }
});

export default TripSummaryScreen;
