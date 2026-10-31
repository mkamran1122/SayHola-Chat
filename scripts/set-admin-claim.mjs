/**
 * SayHola — Firebase Admin SDK Script to Set Custom Claims & Admin Registry
 * 
 * Usage:
 *   1. Download your service account key from:
 *      Firebase Console -> Project Settings -> Service accounts -> Generate new private key
 *   2. Save it on your computer in the project root as `serviceAccountKey.json` (already in .gitignore).
 *   3. Run:
 *      node scripts/set-admin-claim.mjs <USER_EMAIL_OR_UID>
 * 
 * This sets:
 *   1. Firebase Auth custom user claim: { admin: true }
 *   2. Realtime Database admin node: /admins/{uid} = true
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

let targetIdentifier = process.argv[2] || process.env.ADMIN_UID;

async function getTargetIdentifier() {
  if (targetIdentifier && targetIdentifier.trim()) {
    return targetIdentifier.trim();
  }

  // If in interactive terminal, prompt the user
  if (process.stdin.isTTY || !process.stdin.isTTY) {
    try {
      const rl = createInterface({ input, output });
      const answer = await rl.question('Enter Firebase Admin user UID or email: ');
      rl.close();
      if (answer && answer.trim()) {
        return answer.trim();
      }
    } catch {
      // readline not available or stdin closed
    }
  }

  console.error('\n❌ Error: Please provide an email address or UID.');
  console.error('Usage: node scripts/set-admin-claim.mjs <user@email.com or UID>');
  console.error('   or: ADMIN_UID=<UID> node scripts/set-admin-claim.mjs\n');
  process.exit(1);
}

const keyPath = resolve(process.cwd(), 'serviceAccountKey.json');

if (!existsSync(keyPath)) {
  console.error('\n❌ Error: serviceAccountKey.json not found in root directory.');
  console.error('Download your service account private key from:');
  console.error('  Firebase Console -> Project Settings -> Service accounts -> Generate new private key\n');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch (parseErr) {
  console.error('\n❌ Error: Unable to parse serviceAccountKey.json.');
  process.exit(1);
}

// Security check: verify service account targets sayhola-chat
if (serviceAccount.project_id !== 'sayhola-chat') {
  console.error(`\n❌ Error: serviceAccountKey.json is for project "${serviceAccount.project_id}", but this script requires "sayhola-chat".`);
  process.exit(1);
}

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://sayhola-chat-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const auth = getAuth(app);

async function setAdmin() {
  try {
    const identifier = await getTargetIdentifier();
    let user;
    if (identifier.includes('@')) {
      user = await auth.getUserByEmail(identifier);
    } else {
      user = await auth.getUser(identifier);
    }

    console.log(`\nFound user: ${user.email || 'Anonymous'} (UID: ${user.uid})`);
    
    // 1. Set custom claim { admin: true } in Firebase Auth
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Success: Custom claim { admin: true } assigned in Firebase Auth.`);

    // 2. Also register in Realtime Database /admins/{uid} = true
    try {
      const db = getDatabase(app);
      await db.ref(`admins/${user.uid}`).set(true);
      console.log(`✅ Success: Added UID to Realtime Database /admins/${user.uid}`);
    } catch (dbErr) {
      console.log(`ℹ️ Realtime Database note: ${dbErr.message}`);
    }
    
    console.log('\n🎉 Admin registration complete! The user can now log in to the SayHola Admin Dashboard with full administrative privileges.\n');
  } catch (err) {
    console.error('\n❌ Failed to set admin privileges:', err.message);
    process.exit(1);
  }
}

setAdmin();
