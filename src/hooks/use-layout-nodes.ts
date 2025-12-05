import {useEffect} from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import {type Edge, useNodesInitialized, useReactFlow} from '@xyflow/react';

import type {ElkNodeType} from "@/interfaces/components/ElkNode.tsx";

const layoutOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    'elk.spacing.nodeNode': '40',
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
};

const elk = new ELK();

// uses elk to give each node a laid out position
export const getLaidOutNodes = async (nodes: ElkNodeType[], edges: Edge[]) => {
    const graph = {
        id: 'root',
        layoutOptions,
        children: nodes.map((n) => {
            const targetPorts = n.data.targetHandles.map((t) => ({
                id: t.id,

                // ⚠️ it's important to let elk know on which side the port is
                // in this example targets are on the left (WEST) and sources on the right (EAST)
                properties: {
                    side: 'WEST',
                },
            }));

            const sourcePorts = n.data.sourceHandles.map((s) => ({
                id: s.id,
                properties: {
                    side: 'EAST',
                },
            }));

            return {
                id: n.id,
                width: n.width ?? 150,
                height: n.height ?? 50,
                // ⚠️ we need to tell elk that the ports are fixed, in order to reduce edge crossings
                properties: {
                    'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
                },
                // we are also passing the id, so we can also handle edges without a sourceHandle or targetHandle option
                ports: [{ id: n.id }, ...targetPorts, ...sourcePorts],
            };
        }),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.sourceHandle || e.source],
            targets: [e.targetHandle || e.target],
        })),
    };

    const laidOutGraph = await elk.layout(graph);

    return nodes.map((node) => {
        const laidOutNodes = laidOutGraph.children?.find((lgNode) => lgNode.id === node.id);

        return {
            ...node,
            position: {
                x: laidOutNodes?.x ?? 0,
                y: laidOutNodes?.y ?? 0,
            },
        };
    });
};

const useLayoutNodes = (trigger?: unknown) => {
    const nodesInitialized = useNodesInitialized();
    const { getNodes, getEdges, setNodes, fitView } = useReactFlow<ElkNodeType>();

    useEffect(() => {
        if (nodesInitialized) {
            const layoutNodes = async () => {
                const laidOutNodes = await getLaidOutNodes(getNodes() as ElkNodeType[], getEdges());

                setNodes(laidOutNodes);
                await fitView();
            };

            layoutNodes().then(undefined);
        }
    }, [nodesInitialized, getNodes, getEdges, setNodes, fitView, trigger]);

    return null;
}

export default useLayoutNodes
