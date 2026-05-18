import { useState, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import toast from 'react-hot-toast';
import { authAPI } from '../services';
import { useAuthStore } from '../store';

export const useMetaMask = () => {
  const [connecting, setConnecting] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState(null);
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);

  const connectWallet = useCallback(async (linkToProfile = true) => {
    if (!window.ethereum) {
      toast.error('MetaMask not installed. Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return null;
    }

    setConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      setConnectedAddress(address);

      if (linkToProfile) {
        await authAPI.linkWallet({ walletAddress: address });
        updateUser({ walletAddress: address });
        toast.success('MetaMask wallet connected!');
      }

      return address;
    } catch (err) {
      toast.error(err.message || 'Failed to connect wallet');
      return null;
    } finally {
      setConnecting(false);
    }
  }, [updateUser]);

  const switchNetwork = useCallback(async (chainId = '0xaa36a7') => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  }, []);

  return {
    connectWallet,
    switchNetwork,
    connecting,
    connectedAddress: connectedAddress || user?.walletAddress,
    isInstalled: typeof window !== 'undefined' && !!window.ethereum,
  };
};
