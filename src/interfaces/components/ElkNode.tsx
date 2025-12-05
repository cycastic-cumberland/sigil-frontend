import {Handle, type Node, type NodeProps, Position} from '@xyflow/react';

export type ElkNodeData = {
    label: string;
    sourceHandles: { id: string }[];
    targetHandles: { id: string }[];
    onClick?: () => void;
}

export type ElkNodeType = Node<ElkNodeData, 'elk'>

const ElkNode = ({ data }: NodeProps<ElkNodeType>) => {
    return (
        <>
            <div className="handles targets">
                {data.targetHandles.map((handle) => (
                    <Handle
                        key={handle.id}
                        id={handle.id}
                        type="target"
                        position={Position.Left}
                    />
                ))}
            </div>
            <div className="label" onClick={data.onClick}>{data.label}</div>
            <div className="handles sources">
                {data.sourceHandles.map((handle) => (
                    <Handle
                        key={handle.id}
                        id={handle.id}
                        type="source"
                        position={Position.Right}
                    />
                ))}
            </div>
        </>
    )
}

export default ElkNode
