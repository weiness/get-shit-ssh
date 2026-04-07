export interface Host {
  id: string
  name: string
  groupName: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key' | ''
  keyId: string
  createdAt: number
  updatedAt: number
}
