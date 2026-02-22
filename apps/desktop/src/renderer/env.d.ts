import type { SquadAPI } from '../preload/index'

declare global {
  interface Window {
    squadAPI: SquadAPI
  }
}
