import { useMemo } from 'react';
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, useNodesState, useEdgesState, MarkerType, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';
import { Globe, Shield, Wifi, Network, Server, Monitor, Smartphone, Tablet, HardDrive, Tv, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TopologyNode, TopologyEdge } from '@/types';

const CustomNode = ({ data }: { data: any }) => {
  const icons: Record<string, any> = { Globe, Shield, Wifi, Network, Server, Monitor, Smartphone, Tablet, HardDrive, Tv, Laptop };
  const Icon = icons[data.icon] || Monitor;
  const statusColors: Record<string, string> = { online: 'border-noc-green/50 bg-noc-green/10', offline: 'border-noc-red/50 bg-noc-red/10', warning: 'border-noc-yellow/50 bg-noc-yellow/10' };
  const iconColors: Record<string, string> = { online: 'text-noc-green', offline: 'text-noc-red', warning: 'text-noc-yellow' };
  return (
    <div className={cn('px-3 py-2 rounded-sm border-2 bg-noc-card min-w-[120px]', statusColors[data.status || 'online'])}>
      <div className='flex items-center gap-2'>
        <Icon className={cn('w-4 h-4', iconColors[data.status || 'online'])} />
        <span className='text-xs font-medium text-noc-text truncate'>{data.label}</span>
      </div>
      {data.details && (
        <div className='mt-1 text-[10px] text-noc-text-muted'>
          {Object.entries(data.details).map(([key, value]) => <div key={key}>{key}: {String(value)}</div>)}
        </div>
      )}
    </div>
  );
};

export function NetworkTopology({ nodes: topologyNodes, edges: topologyEdges, className }: { nodes: TopologyNode[]; edges: TopologyEdge[]; className?: string }) {
  const initialNodes: Node[] = useMemo(() => topologyNodes.map((node) => ({ id: node.id, type: 'custom', position: node.position, data: node.data })), [topologyNodes]);
  const initialEdges: Edge[] = useMemo(() => topologyEdges.map((edge) => ({
    id: edge.id, source: edge.source, target: edge.target, type: 'smoothstep', animated: edge.animated,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  })), [topologyEdges]);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  return (
    <div className={cn('bg-noc-card border border-noc-border rounded-sm overflow-hidden', className)}>
      <div className='px-4 py-3 border-b border-noc-border'>
        <h3 className='text-sm font-semibold text-noc-text'>网络拓扑</h3>
      </div>
      <div className='h-[400px]'>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          nodeTypes={{ custom: CustomNode }} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.5} maxZoom={1.5} proOptions={{ hideAttribution: true }}>
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color='rgba(255,255,255,0.05)' />
          <Controls showInteractive={false} className='!bg-noc-card !border-noc-border !rounded-sm' />
          <MiniMap nodeColor={(node) => node.data?.status === 'online' ? '#22c55e' : node.data?.status === 'offline' ? '#ef4444' : '#3b82f6'}
            maskColor='rgba(0,0,0,0.7)' className='!bg-noc-bg !border-noc-border !rounded-sm' />
        </ReactFlow>
      </div>
    </div>
  );
}