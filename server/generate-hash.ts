import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('\n=== User Hash Generator ===\n');

    const username = await question('Username: ');
    const password = await question('Password: ');
    const name = await question('Display Name (press Enter to use username): ');

    const hash = bcrypt.hashSync(password, 12);

    console.log('\n--- Generated SQL ---\n');
    console.log(`INSERT INTO users (tenant_id, username, password_hash, name)`);
    console.log(`VALUES (1, '${username}', '${hash}', '${name || username}');`);
    console.log('\n--- Or to update existing user ---\n');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = '${username}';`);
    console.log('');

    rl.close();
}

main();
