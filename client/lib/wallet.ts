// lib/wallet.ts
export type WalletType = "hive-keychain" | "vsc-chain" | null

export interface WalletUser {
  username: string
  publicKey?: string
  walletType: WalletType
}

// Hive Keychain types
declare global {
  interface Window {
    hive_keychain?: {
      requestHandshake: (callback: () => void) => void
      requestSignBuffer: (
        username: string,
        message: string,
        method: string,
        callback: (response: { 
          success: boolean
          result?: string
          message?: string
          publicKey?: string 
        }) => void
      ) => void
      requestTransfer: (
        username: string,
        to: string,
        amount: string,
        memo: string,
        currency: string,
        callback: (response: {
          success: boolean
          result?: any
          message?: string
          error?: string
        }) => void,
        enforce?: boolean
      ) => void
    }
    vsc?: {
      connect: () => Promise<{ username: string; publicKey: string }>
      isConnected: () => boolean
      getUser: () => { username: string; publicKey: string } | null
    }
  }
}

export class WalletManager {
  static async connectHiveKeychain(username: string): Promise<WalletUser> {
    return new Promise((resolve, reject) => {
      if (!window.hive_keychain) {
        reject(new Error("Hive Keychain extension not found. Please install it first."))
        return
      }

      if (!username || !username.trim()) {
        reject(new Error("Username is required"))
        return
      }

      window.hive_keychain.requestHandshake(() => {
        const message = `Monster Hunt Login - ${Date.now()}`
        window.hive_keychain!.requestSignBuffer(
          username.trim(),
          message,
          "Posting",
          (response) => {
            if (response.success) {
              resolve({
                username: username.trim(),
                publicKey: response.publicKey,
                walletType: "hive-keychain"
              })
            } else {
              reject(new Error(response.message || "Failed to authenticate with Hive Keychain"))
            }
          }
        )
      })
    })
  }

  static async connectVSCChain(): Promise<WalletUser> {
    if (!window.vsc) {
      throw new Error("VSC Chain wallet not found. Please install it first.")
    }

    const user = await window.vsc.connect()
    if (user && user.username) {
      return {
        username: user.username,
        publicKey: user.publicKey,
        walletType: "vsc-chain"
      }
    } else {
      throw new Error("Failed to connect to VSC Chain wallet")
    }
  }

  static isHiveKeychainAvailable(): boolean {
    return typeof window !== "undefined" && !!window.hive_keychain
  }

  static isVSCChainAvailable(): boolean {
    return typeof window !== "undefined" && !!window.vsc
  }

  static saveWalletInfo(user: WalletUser): void {
    try {
      localStorage.setItem("mh_playerName", user.username)
      localStorage.setItem("mh_wallet", user.username)
      localStorage.setItem("mh_walletType", user.walletType || "")
      if (user.publicKey) {
        localStorage.setItem("mh_walletPublicKey", user.publicKey)
      }
    } catch (e) {
      console.error("Failed to save wallet info to localStorage", e)
    }
  }

  static loadWalletInfo(): WalletUser | null {
    try {
      const username = localStorage.getItem("mh_wallet")
      const walletType = localStorage.getItem("mh_walletType") as WalletType
      const publicKey = localStorage.getItem("mh_walletPublicKey") || undefined

      if (username && walletType) {
        return { username, walletType, publicKey }
      }
    } catch (e) {
      console.error("Failed to load wallet info from localStorage", e)
    }

    return null
  }

  static async transferHBD(
    fromUsername: string,
    toUsername: string,
    amount: number,
    memo: string = ""
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    return new Promise((resolve, reject) => {
      if (!window.hive_keychain) {
        reject(new Error("Hive Keychain extension not found"))
        return
      }

      // Format amount to 3 decimal places for HBD
      const formattedAmount = amount.toFixed(3)

      window.hive_keychain.requestTransfer(
        fromUsername,
        toUsername,
        formattedAmount,
        memo,
        "HBD",
        (response) => {
          if (response.success) {
            resolve({
              success: true,
              transactionId: response.result?.id || response.result
            })
          } else {
            resolve({
              success: false,
              error: response.message || response.error || "Transfer failed"
            })
          }
        },
        true // enforce - show confirmation dialog
      )
    })
  }

  static clearWalletInfo(): void {
    try {
      localStorage.removeItem("mh_wallet")
      localStorage.removeItem("mh_walletType")
      localStorage.removeItem("mh_walletPublicKey")
    } catch (e) {
      console.error("Failed to clear wallet info from localStorage", e)
    }
  }
}
