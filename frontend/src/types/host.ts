export interface Host {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: Uint8Array // encrypted
  privateKey?: Uint8Array // encrypted
  passphrase?: Uint8Array // encrypted
  tags?: string[]
  createdAt: number
  updatedAt: number
}
