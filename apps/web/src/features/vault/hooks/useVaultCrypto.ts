import { useCallback } from "react";
import {
	base64ToSalt,
	createBackup,
	decryptFile,
	decryptFileKey,
	decryptPrivateKey,
	deriveKEK,
	encryptFile,
	encryptFileKey,
	encryptPrivateKey,
	exportPublicKeyAsJwk,
	generateFileKey,
	generateKeyPair,
	generateSalt,
	getKeyFingerprint,
	importPublicKey,
	parseBackup,
	saltToBase64,
	type VaultBackup,
} from "@/features/vault/lib/crypto";
import { useVaultStore } from "@/features/vault/store/vaultStore";
import {
	useChangeVaultPassphrase,
	useSetupVault,
} from "@/features/vault/hooks/useVault";

export function useVaultCrypto() {
	const store = useVaultStore();
	const [, executeSetupVault] = useSetupVault();
	const [, executeChangePassphrase] = useChangeVaultPassphrase();

	/**
	 * Generate keys, encrypt private key with passphrase-derived KEK,
	 * persist to server + store, return backup data.
	 */
	const setupVault = useCallback(
		async (passphrase: string) => {
			const salt = generateSalt();
			const kek = await deriveKEK(passphrase, salt);
			const { publicKey, privateKey } = await generateKeyPair();

			const encryptedPrivKey = await encryptPrivateKey(privateKey, kek);
			const publicKeyJwk = await exportPublicKeyAsJwk(publicKey);
			const publicKeyStr = JSON.stringify(publicKeyJwk);
			const kekSaltStr = saltToBase64(salt);

			const result = await executeSetupVault({
				input: {
					publicKey: publicKeyStr,
					encryptedPrivateKey: encryptedPrivKey,
					kekSalt: kekSaltStr,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			// Persist to store
			store.setKeyMaterial(publicKeyStr, encryptedPrivKey, kekSaltStr);
			store.unlock(privateKey);

			return createBackup(publicKeyJwk, encryptedPrivKey, kekSaltStr);
		},
		[executeSetupVault, store],
	);

	/**
	 * Derive KEK from passphrase, decrypt private key, unlock vault.
	 */
	const unlockVault = useCallback(
		async (passphrase: string) => {
			if (!store.encryptedPrivateKey || !store.kekSalt) {
				throw new Error(
					"No vault key material found. Please set up your vault.",
				);
			}

			const salt = base64ToSalt(store.kekSalt);
			const kek = await deriveKEK(passphrase, salt);

			// This will throw if the passphrase is wrong (AES-GCM tag mismatch)
			const privateKey = await decryptPrivateKey(
				store.encryptedPrivateKey,
				kek,
			);

			store.unlock(privateKey);
		},
		[store],
	);

	/**
	 * Lock the vault (clear decrypted key from memory).
	 */
	const lockVault = useCallback(() => {
		store.lock();
	}, [store]);

	/**
	 * Encrypt a file for upload. Returns encrypted blob and encrypted file key.
	 */
	const encryptForUpload = useCallback(
		async (file: File) => {
			if (!store.publicKey) {
				throw new Error("Vault not set up");
			}

			const publicKeyJwk: JsonWebKey = JSON.parse(store.publicKey);
			const publicKey = await importPublicKey(publicKeyJwk);

			const fileKey = await generateFileKey();
			const fileBuffer = await file.arrayBuffer();
			const encryptedBuffer = await encryptFile(fileBuffer, fileKey);
			const encryptedFileKey = await encryptFileKey(fileKey, publicKey);

			const encryptedBlob = new Blob([encryptedBuffer], {
				type: "application/octet-stream",
			});

			return { encryptedBlob, encryptedFileKey, fileKey };
		},
		[store.publicKey],
	);

	/**
	 * Decrypt a downloaded file.
	 */
	const decryptDownload = useCallback(
		async (encryptedData: ArrayBuffer, encryptedFileKey: string) => {
			if (!store.decryptedPrivateKey) {
				throw new Error("Vault is locked. Please unlock it first.");
			}

			const fileKey = await decryptFileKey(
				encryptedFileKey,
				store.decryptedPrivateKey,
			);
			return decryptFile(encryptedData, fileKey);
		},
		[store.decryptedPrivateKey],
	);

	/**
	 * Change vault passphrase: decrypt private key with old KEK,
	 * re-encrypt with new KEK, update server.
	 */
	const changePassphrase = useCallback(
		async (currentPassphrase: string, newPassphrase: string) => {
			if (!store.encryptedPrivateKey || !store.kekSalt) {
				throw new Error("No vault key material found.");
			}

			// Decrypt with old passphrase
			const oldSalt = base64ToSalt(store.kekSalt);
			const oldKek = await deriveKEK(currentPassphrase, oldSalt);
			const privateKey = await decryptPrivateKey(
				store.encryptedPrivateKey,
				oldKek,
			);

			// Re-encrypt with new passphrase
			const newSalt = generateSalt();
			const newKek = await deriveKEK(newPassphrase, newSalt);
			const newEncryptedPrivKey = await encryptPrivateKey(privateKey, newKek);
			const newKekSalt = saltToBase64(newSalt);

			const result = await executeChangePassphrase({
				input: {
					encryptedPrivateKey: newEncryptedPrivKey,
					kekSalt: newKekSalt,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			// Update local store
			store.setKeyMaterial(
				store.publicKey ?? "",
				newEncryptedPrivKey,
				newKekSalt,
			);
			store.unlock(privateKey);
		},
		[store, executeChangePassphrase],
	);

	/**
	 * Trigger browser download of a JSON backup file.
	 */
	const downloadBackup = useCallback((backup: VaultBackup) => {
		const json = JSON.stringify(backup, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `drivebase-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	/**
	 * Restore vault from a backup JSON file.
	 * Verifies passphrase works before persisting.
	 */
	const restoreFromBackup = useCallback(
		async (file: File, passphrase: string) => {
			const text = await file.text();
			const backup = parseBackup(text);

			// Verify passphrase works
			const salt = base64ToSalt(backup.kekSalt);
			const kek = await deriveKEK(passphrase, salt);
			// Will throw if passphrase is wrong
			const privateKey = await decryptPrivateKey(
				backup.encryptedPrivateKey,
				kek,
			);

			const publicKeyStr = JSON.stringify(backup.publicKey);

			// Persist to server and store
			const result = await executeSetupVault({
				input: {
					publicKey: publicKeyStr,
					encryptedPrivateKey: backup.encryptedPrivateKey,
					kekSalt: backup.kekSalt,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			store.setKeyMaterial(
				publicKeyStr,
				backup.encryptedPrivateKey,
				backup.kekSalt,
			);
			store.unlock(privateKey);
		},
		[executeSetupVault, store],
	);

	/**
	 * Get a short display fingerprint of the public key.
	 */
	const getFingerprint = useCallback(async () => {
		if (!store.publicKey) {
			return null;
		}
		const jwk: JsonWebKey = JSON.parse(store.publicKey);
		return getKeyFingerprint(jwk);
	}, [store.publicKey]);

	return {
		setupVault,
		unlockVault,
		lockVault,
		encryptForUpload,
		decryptDownload,
		changePassphrase,
		downloadBackup,
		restoreFromBackup,
		getFingerprint,
		isUnlocked: store.isUnlocked,
		isSetUp: store.isSetUp,
	};
}
