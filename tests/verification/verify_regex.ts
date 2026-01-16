
const strictRegex = /^[^<>{}\\\r\n]+$/;

console.log("--- Testing Strict Regex (for drinkName & AI flow) ---");
const strictSafe = ["Gin & Tonic", "Old Fashioned"];
const strictMalicious = ["Drink\nInjection", "Drink\r\nInjection", "Drink<Tag>", "Drink{Obj}"];

strictSafe.forEach(input => {
    if (!strictRegex.test(input)) console.error(`❌ Safe strict input rejected: "${input}"`);
    else console.log(`✅ Safe strict input accepted: "${input}"`);
});

strictMalicious.forEach(input => {
    if (strictRegex.test(input)) console.error(`⚠️ Malicious strict input ACCEPTED: "${input.replace(/[\r\n]+/g, '\\n')}"`);
    else console.log(`🛡️ Malicious strict input blocked: "${input.replace(/[\r\n]+/g, '\\n')}"`);
});

console.log("\n--- Testing Sanitization Logic (for description) ---");
const descriptionInput = "My drink\nHas multiple\r\nLines";
const sanitized = descriptionInput.replace(/[\r\n]+/g, ' ');
console.log(`Original: "${descriptionInput.replace(/[\r\n]+/g, '\\n')}"`);
console.log(`Sanitized: "${sanitized}"`);

if (sanitized === "My drink Has multiple Lines") {
    console.log("✅ Sanitization working correctly.");
} else {
    console.error("❌ Sanitization failed.");
    process.exit(1);
}

if (strictRegex.test(sanitized)) {
    console.log("✅ Sanitized output passes strict regex.");
} else {
    console.error("❌ Sanitized output FAILED strict regex.");
    process.exit(1);
}
