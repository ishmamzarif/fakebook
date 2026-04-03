require("dotenv").config();
const { checkText } = require("./utils/moderation");

async function testVerbose() {
    const inputs = [
        { text: "I love kittens", expected: false },
        { text: "I hate you and want to kill you", expected: true }
    ];

    for (const input of inputs) {
        console.log(`\nTesting: "${input.text}"`);
        const result = await checkText(input.text);
        console.log(`Result: ${result} (Expected: ${input.expected})`);
        if (result !== input.expected) {
            console.error("FAIL!");
        } else {
            console.log("PASS!");
        }
    }
    process.exit(0);
}

testVerbose();
