import MarketRate from '../models/MarketRate.js';

// @desc    Get all market rates
export const getMarketRates = async (req, res) => {
    try {
        const rates = await MarketRate.find();
        res.json(rates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update or Create market rate
export const updateMarketRate = async (req, res) => {
    const { fishType, gradeAPrice, gradeBPrice, retailPriceA, retailPriceB, gradeCPrice } = req.body;

    try {
        let rate = await MarketRate.findOne({ fishType });

        if (rate) {
            rate.gradeAPrice = gradeAPrice !== undefined ? gradeAPrice : rate.gradeAPrice;
            rate.gradeBPrice = gradeBPrice !== undefined ? gradeBPrice : rate.gradeBPrice;
            rate.retailPriceA = retailPriceA !== undefined ? retailPriceA : rate.retailPriceA;
            rate.retailPriceB = retailPriceB !== undefined ? retailPriceB : rate.retailPriceB;
            rate.gradeCPrice = gradeCPrice !== undefined ? gradeCPrice : rate.gradeCPrice;
            rate.lastUpdatedBy = req.user._id;
            await rate.save();
        } else {
            rate = await MarketRate.create({
                fishType,
                gradeAPrice,
                gradeBPrice,
                retailPriceA,
                retailPriceB,
                gradeCPrice,
                lastUpdatedBy: req.user._id
            });
        }

        res.status(200).json(rate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Seed default rates if none exist
export const seedRates = async () => {
    const defaultTypes = ['Tuna (කෙලවල්ලා)', 'Skipjack (බලයා)', 'Marlin (කොප්පරා)', 'Mullet (මෝරා)', 'Other'];
    try {
        const count = await MarketRate.countDocuments();
        if (count === 0) {
            const rates = defaultTypes.map(type => ({
                fishType: type,
                gradeAPrice: 1500,
                gradeBPrice: 1000,
                retailPriceA: 1800,
                retailPriceB: 1300,
                gradeCPrice: 200
            }));
            await MarketRate.insertMany(rates);
            console.log('✅ Market Rates Seeded');
        }
    } catch (error) {
        console.error('Market Rate Seeding Error:', error);
    }
};
