import { isRateLimited } from '../src/lib/rate-limit-logic';

const TEST_IP = '127.0.0.1';
const CONFIG = {
    windowMs: 1000, // 1 second for test
    max: 5
};

console.log("Testing Rate Limit Logic...");

// 1. Should allow first 5 requests
for (let i = 0; i < 5; i++) {
    const limited = isRateLimited(TEST_IP, CONFIG);
    if (limited) {
        console.error(`FAIL: Request ${i+1} blocked unexpectedly.`);
        process.exit(1);
    }
}
console.log("PASS: First 5 requests allowed.");

// 2. Should block 6th request
const blocked = isRateLimited(TEST_IP, CONFIG);
if (!blocked) {
    console.error("FAIL: Request 6 allowed unexpectedly.");
    process.exit(1);
}
console.log("PASS: 6th request blocked.");

// 3. Should allow after window expires
console.log("Waiting for window to expire...");
setTimeout(() => {
    const reset = !isRateLimited(TEST_IP, CONFIG);
    if (reset) {
        console.log("PASS: Request allowed after window reset.");
        process.exit(0);
    } else {
        console.error("FAIL: Request blocked after window reset.");
        process.exit(1);
    }
}, 1100);
