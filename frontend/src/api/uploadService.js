import client from './client';

export const uploadToServer = async (uri) => {
    try {
        const formData = new FormData();
        
        // Prepare the file object for FormData
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
            uri: uri,
            name: filename,
            type: type,
        });

        const response = await client.post('/api/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            transformRequest: (data) => data, // Important for some axios versions
        });

        return response.data.url;
    } catch (error) {
        console.error('Local Upload Error:', error);
        throw error;
    }
};
