import BuyerPrice from '../models/BuyerPrice.js';

// @desc    Get current buyer's prices
export const getMyPrices = async (req, res) => {
    try {
        const prices = await BuyerPrice.find({ buyerId: req.user._id });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get specific buyer's prices
export const getBuyerPrices = async (req, res) => {
    try {
        const prices = await BuyerPrice.find({ buyerId: req.params.buyerId });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update or Create buyer price
export const updateBuyerPrice = async (req, res) => {
    const { fishType, retailPriceA, retailPriceB } = req.body;
    const buyerId = req.user._id;

    try {
        let price = await BuyerPrice.findOne({ buyerId, fishType });

        if (price) {
            price.retailPriceA = retailPriceA !== undefined ? retailPriceA : price.retailPriceA;
            price.retailPriceB = retailPriceB !== undefined ? retailPriceB : price.retailPriceB;
            await price.save();
        } else {
            price = await BuyerPrice.create({
                buyerId,
                fishType,
                retailPriceA,
                retailPriceB
            });
        }

        res.status(200).json(price);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
