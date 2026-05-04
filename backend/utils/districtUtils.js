export const getNearbyDistricts = (district) => {
    const map = {
        'Galle': ['Galle', 'Matara', 'Hambantota'],
        'Matara': ['Matara', 'Galle', 'Hambantota'],
        'Hambantota': ['Hambantota', 'Matara', 'Galle'],
        'Colombo': ['Colombo', 'Kalutara', 'Gampaha'],
        'Kalutara': ['Kalutara', 'Colombo', 'Galle'],
        'Gampaha': ['Gampaha', 'Colombo', 'Puttalam'],
        'Puttalam': ['Puttalam', 'Gampaha', 'Mannar'],
        'Trincomalee': ['Trincomalee', 'Mullaitivu', 'Batticaloa'],
        'Batticaloa': ['Batticaloa', 'Trincomalee', 'Ampara'],
        'Ampara': ['Ampara', 'Batticaloa', 'Hambantota'],
        'Jaffna': ['Jaffna', 'Kilinochchi', 'Mannar'],
        'Mannar': ['Mannar', 'Jaffna', 'Puttalam'],
        'Mullaitivu': ['Mullaitivu', 'Trincomalee', 'Jaffna']
    };
    return map[district] || [district];
};
