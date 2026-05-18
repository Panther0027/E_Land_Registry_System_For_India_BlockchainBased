import { SEPOLIA_ADDRESS_EXPLORER } from '../constants';
import { formatArea } from '../utils';

const formatTs = (ts) => new Date(ts * 1000).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const BlockchainVerifyPanel = ({ blockchainData }) => {
  if (!blockchainData) return null;

  const { verified, data, history, onChain, demo, contractAddress, network, message } = blockchainData;

  return (
    <div className="mt-4 p-4 bg-accent rounded-xl text-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-primary">Blockchain Record</p>
        {onChain && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Live on Sepolia</span>
        )}
        {demo && !onChain && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-primary font-medium">Demo mode</span>
        )}
      </div>

      {verified && data ? (
        <>
          <p className="text-success font-medium">✓ Record confirmed on {network || 'Sepolia'} testnet</p>
          {message && <p className="text-text-secondary text-xs">{message}</p>}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-text-secondary">On-chain status</span>
              <p className="font-medium capitalize">{data.status}</p>
            </div>
            <div>
              <span className="text-text-secondary">Location</span>
              <p className="font-medium">{data.location}</p>
            </div>
            <div>
              <span className="text-text-secondary">Area</span>
              <p className="font-medium">{formatArea(data.area)}</p>
            </div>
            <div>
              <span className="text-text-secondary">IPFS hash</span>
              <p className="font-medium truncate" title={data.ipfsHash}>{data.ipfsHash}</p>
            </div>
          </div>
          {contractAddress && (
            <a
              href={`${SEPOLIA_ADDRESS_EXPLORER}${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-block"
            >
              View smart contract on Etherscan →
            </a>
          )}
          {history?.length > 0 && (
            <div>
              <p className="font-medium text-primary mb-2">Ownership history</p>
              <ul className="space-y-2">
                {history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-2 border-l-2 border-primary/20 pl-3">
                    <span className="font-medium">{h.actionType}</span>
                    <span className="text-text-secondary text-xs">{formatTs(h.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-error font-medium">✗ Not found on blockchain</p>
      )}
    </div>
  );
};

export default BlockchainVerifyPanel;
