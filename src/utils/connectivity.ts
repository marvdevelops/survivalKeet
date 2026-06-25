import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export async function isOnline(): Promise<boolean> {
  const state: NetInfoState = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    callback(online);
  });
}
