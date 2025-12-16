require('dotenv').config();
const Replicate = require('replicate');

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function checkModel(owner, name) {
    try {
        console.log(`Checking ${owner}/${name}...`);
        const model = await replicate.models.get(owner, name);
        const latestVersion = model.latest_version;
        console.log(`Latest version for ${owner}/${name}:`);
        console.log(latestVersion.id);
    } catch (error) {
        console.error(`Error checking ${owner}/${name}:`, error.message);
    }
}

async function main() {
    await checkModel('nightmareai', 'real-esrgan');
    await checkModel('piddnad', 'ddcolor');
}

main();
