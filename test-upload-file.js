// test-upload-file.js
const { Blob } = require('buffer');

async function testFileUpload() {
    try {
        console.log('Testing File Upload...');

        // Create a dummy file
        const fileContent = 'Hello World';
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', blob, 'test.txt');

        const response = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error('Upload failed with status:', response.status);
            const text = await response.text();
            console.error('Response:', text);
        } else {
            console.log('Upload successful!');
            const data = await response.json();
            console.log(data);
        }
    } catch (error) {
        console.error('Test script error:', error);
    }
}

testFileUpload();
