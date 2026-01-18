// No import needed for Node 18+
async function testUrlUpload() {
    console.log('--- Testing URL Upload ---');
    const url = 'https://dummyimage.com/600x400/000/fff.png&text=TestSync'; // Valid image URL

    try {
        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, folderId: 'null' })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Response:', text.substring(0, 300));

        if (res.status === 200) {
            console.log('SUCCESS: URL Upload worked.');
        } else {
            console.log('FAILURE: URL Upload failed.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testUrlUpload();
