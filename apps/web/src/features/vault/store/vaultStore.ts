import { create } from "zustand";

const STORAGE_KEY_PUBLIC_KEY = "vault:publicKey";
const STORAGE_KEY_ENCRYPTED_PRIVATE_KEY = "vault:encryptedPrivateKey";
const STORAGE_KEY_KEK_SALT = "vault:kekSalt";

interface VaultState {
	// Persisted to localStorage (key material — safe to store, never plaintext)
	publicKey: string | null;
	encryptedPrivateKey: string | null;
	kekSalt: string | null;

	// In-memory only — lost on tab close (CryptoKey cannot be serialised)
	decryptedPrivateKey: CryptoKey | null;

	// Derived state
	isUnlocked: boolean;
	isSetUp: boolean;

	// Actions
	setKeyMaterial: (
		publicKey: string,
		encryptedPrivateKey: string,
		kekSalt: string,
	) => void;
	unlock: (privateKey: CryptoKey) => void;
	lock: () => void;
	clear: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
	publicKey: localStorage.getItem(STORAGE_KEY_PUBLIC_KEY),
	encryptedPrivateKey: localStorage.getItem(STORAGE_KEY_ENCRYPTED_PRIVATE_KEY),
	kekSalt: localStorage.getItem(STORAGE_KEY_KEK_SALT),
	decryptedPrivateKey: null,

	isUnlocked: false,
	isSetUp: !!localStorage.getItem(STORAGE_KEY_PUBLIC_KEY),

	setKeyMaterial: (publicKey, encryptedPrivateKey, kekSalt) => {
		localStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKey);
		localStorage.setItem(
			STORAGE_KEY_ENCRYPTED_PRIVATE_KEY,
			encryptedPrivateKey,
		);
		localStorage.setItem(STORAGE_KEY_KEK_SALT, kekSalt);
		set({ publicKey, encryptedPrivateKey, kekSalt, isSetUp: true });
	},

	unlock: (privateKey: CryptoKey) => {
		set({ decryptedPrivateKey: privateKey, isUnlocked: true });
	},

	lock: () => {
		set({ decryptedPrivateKey: null, isUnlocked: false });
	},

	clear: () => {
		localStorage.removeItem(STORAGE_KEY_PUBLIC_KEY);
		localStorage.removeItem(STORAGE_KEY_ENCRYPTED_PRIVATE_KEY);
		localStorage.removeItem(STORAGE_KEY_KEK_SALT);
		set({
			publicKey: null,
			encryptedPrivateKey: null,
			kekSalt: null,
			decryptedPrivateKey: null,
			isUnlocked: false,
			isSetUp: false,
		});
	},
}));
