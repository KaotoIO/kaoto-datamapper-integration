import {
  createContext,
  FunctionComponent,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  DataRef,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Label } from '@patternfly/react-core';
import { useDataMapper } from '../hooks/useDataMapper';
import { DnDHandler } from './dnd/DnDHandler';
import { NodeData } from '../models/datamapper/visualization';
import { DocumentType, NodePath } from '../models/datamapper/path';

export interface NodeReference {
  headerRef: HTMLDivElement | null;
  containerRef: HTMLDivElement | null;
}

export interface ICanvasContext {
  setNodeReference: (path: string, ref: MutableRefObject<NodeReference>) => void;
  getNodeReference: (path: string) => MutableRefObject<NodeReference> | null;
  reloadNodeReferences: () => void;
  clearNodeReferencesForPath: (path: string) => void;
  clearNodeReferencesForDocument: (documentType: DocumentType, documentId: string) => void;
  getAllNodePaths: () => string[];
  setDefaultHandler: (handler: DnDHandler | undefined) => void;
  getActiveHandler: () => DnDHandler | undefined;
  setActiveHandler: (handler: DnDHandler | undefined) => void;
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const DataMapperCanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();
  const [defaultHandler, setDefaultHandler] = useState<DnDHandler | undefined>();
  const [activeHandler, setActiveHandler] = useState<DnDHandler | undefined>();

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const [activeData, setActiveData] = useState<DataRef<NodeData> | null>(null);
  const [nodeReferenceMap, setNodeReferenceMap] = useState<Map<string, MutableRefObject<NodeReference>>>(
    new Map<string, MutableRefObject<NodeReference>>(),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      activeHandler && activeHandler.handleDragStart(event);
      setActiveData(event.active.data as DataRef<NodeData>);
    },
    [activeHandler],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      activeHandler && activeHandler.handleDragOver(event);
    },
    [activeHandler],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      activeHandler && activeHandler.handleDragEnd(event, mappingTree, refreshMappingTree);
      setActiveData(null);
    },
    [activeHandler, mappingTree, refreshMappingTree],
  );

  const setNodeReference = useCallback(
    (path: string, ref: MutableRefObject<NodeReference>) => {
      nodeReferenceMap.set(path, ref);
    },
    [nodeReferenceMap],
  );

  const getNodeReference = useCallback(
    (path: string) => {
      return nodeReferenceMap.get(path) || null;
    },
    [nodeReferenceMap],
  );

  const reloadNodeReferences = useCallback(() => {
    setNodeReferenceMap(new Map(nodeReferenceMap));
  }, [nodeReferenceMap]);

  const clearNodeReferencesForPath = useCallback(
    (path: string) => {
      Array.from(nodeReferenceMap.keys())
        .filter((key) => key.startsWith(path))
        .forEach((key) => nodeReferenceMap.delete(key));
    },
    [nodeReferenceMap],
  );

  const clearNodeReferencesForDocument = useCallback(
    (documentType: DocumentType, documentId: string) => {
      const pathPrefix = NodePath.fromDocument(documentType, documentId).toString();
      Array.from(nodeReferenceMap.keys())
        .filter((key) => key.startsWith(pathPrefix))
        .forEach((key) => nodeReferenceMap.delete(key));
    },
    [nodeReferenceMap],
  );

  const getAllNodePaths = useCallback(() => {
    return Array.from(nodeReferenceMap.keys());
  }, [nodeReferenceMap]);

  const handleSetDefaultHandler = useCallback(
    (handler: DnDHandler | undefined) => {
      if (!activeHandler) setActiveHandler(handler);
      setDefaultHandler(handler);
    },
    [activeHandler, setDefaultHandler],
  );

  const handleSetActiveHandler = useCallback(
    (handler: DnDHandler | undefined) => {
      setActiveHandler(handler ? handler : defaultHandler);
    },
    [defaultHandler],
  );

  const value: ICanvasContext = useMemo(() => {
    return {
      setNodeReference,
      getNodeReference,
      reloadNodeReferences,
      clearNodeReferencesForPath,
      clearNodeReferencesForDocument,
      getAllNodePaths,
      setDefaultHandler: handleSetDefaultHandler,
      getActiveHandler: () => activeHandler,
      setActiveHandler: handleSetActiveHandler,
    };
  }, [
    setNodeReference,
    getNodeReference,
    reloadNodeReferences,
    clearNodeReferencesForPath,
    clearNodeReferencesForDocument,
    getAllNodePaths,
    handleSetDefaultHandler,
    handleSetActiveHandler,
    activeHandler,
  ]);

  return (
    <CanvasContext.Provider value={value}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {props.children}
        <DragOverlay dropAnimation={null}>
          <Label>{activeData?.current?.title ? activeData.current.title : 'dragging...'}</Label>
        </DragOverlay>
      </DndContext>
    </CanvasContext.Provider>
  );
};