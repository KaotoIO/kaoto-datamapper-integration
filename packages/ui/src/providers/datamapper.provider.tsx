/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { Loading } from '../components/Loading';
import { MappingTree } from '../models/datamapper/mapping';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentInitializationModel,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { CanvasView } from '../models/datamapper/view';
import { DocumentType } from '../models/datamapper/path';
import { MappingSerializerService } from '../services/mapping-serializer.service';
import { MappingService } from '../services/mapping.service';
import { DocumentService } from '../services/document.service';

export interface IDataMapperContext {
  activeView: CanvasView;
  setActiveView(view: CanvasView): void;

  sourceParameterMap: Map<string, IDocument>;
  refreshSourceParameters: () => void;
  sourceBodyDocument: IDocument;
  setSourceBodyDocument: (doc: IDocument) => void;
  targetBodyDocument: IDocument;
  setTargetBodyDocument: (doc: IDocument) => void;
  updateDocumentDefinition: (definition: DocumentDefinition) => Promise<void>;

  isSourceParametersExpanded: boolean;
  setSourceParametersExpanded: (expanded: boolean) => void;

  mappingTree: MappingTree;
  refreshMappingTree(): void;
  setMappingTree(mappings: MappingTree): void;

  debug: boolean;
  setDebug(debug: boolean): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

type DataMapperProviderProps = PropsWithChildren & {
  documentInitializationModel?: DocumentInitializationModel;
  onUpdateDocument?: (definition: DocumentDefinition) => void;
  initialXsltFile?: string;
  onUpdateMappings?: (xsltFile: string) => void;
};

export const DataMapperProvider: FunctionComponent<DataMapperProviderProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  initialXsltFile,
  onUpdateMappings,
  children,
}) => {
  const [debug, setDebug] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);

  const [initializingDocument, setInitializingDocument] = useState<boolean>(true);
  const [sourceParameterMap, setSourceParameterMap] = useState<Map<string, IDocument>>(new Map<string, IDocument>());
  const [isSourceParametersExpanded, setSourceParametersExpanded] = useState<boolean>(false);
  const [sourceBodyDocument, setSourceBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID),
  );
  const [targetBodyDocument, setTargetBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
  );

  useEffect(() => {
    setInitializingDocument(true);
    DocumentService.createInitialDocuments(documentInitializationModel)
      .then((documents) => {
        if (!documents) return;
        documents.sourceBodyDocument && setSourceBodyDocument(documents.sourceBodyDocument);
        setSourceParameterMap(documents.sourceParameterMap);
        documents.targetBodyDocument && setTargetBodyDocument(documents.targetBodyDocument);
      })
      .finally(() => {
        setInitializingDocument(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSourceParameters = useCallback(() => {
    setSourceParameterMap(new Map(sourceParameterMap));
  }, [sourceParameterMap]);

  const [initializingMapping, setInitializingMapping] = useState<boolean>(!!initialXsltFile);
  const [mappingTree, setMappingTree] = useState<MappingTree>(
    new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
  );
  useEffect(() => {
    if (initialXsltFile && !initializingDocument && initializingMapping) {
      MappingSerializerService.deserialize(initialXsltFile, targetBodyDocument!, mappingTree, sourceParameterMap!);
      setInitializingMapping(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializingDocument, initializingMapping]);

  const refreshMappingTree = useCallback(() => {
    const newMapping = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    newMapping.children = mappingTree.children.map((child) => {
      child.parent = newMapping;
      return child;
    });
    newMapping.namespaceMap = mappingTree.namespaceMap;
    setMappingTree(newMapping);
    onUpdateMappings && onUpdateMappings(MappingSerializerService.serialize(mappingTree, sourceParameterMap!));
  }, [mappingTree, onUpdateMappings, sourceParameterMap]);

  const removeStaleMappings = useCallback(
    (documentType: DocumentType, documentId: string, newDocument: IDocument) => {
      let isFromPrimitive: boolean;
      switch (documentType) {
        case DocumentType.SOURCE_BODY:
          isFromPrimitive = sourceBodyDocument instanceof PrimitiveDocument;
          break;
        case DocumentType.TARGET_BODY:
          isFromPrimitive = targetBodyDocument instanceof PrimitiveDocument;
          break;
        case DocumentType.PARAM:
          isFromPrimitive = sourceParameterMap!.get(documentId) instanceof PrimitiveDocument;
      }
      const isToPrimitive = newDocument instanceof PrimitiveDocument;
      const cleaned =
        isFromPrimitive || isToPrimitive
          ? MappingService.removeAllMappingsForDocument(mappingTree, documentType, documentId)
          : MappingService.removeStaleMappingsForDocument(mappingTree, newDocument);
      setMappingTree(cleaned);
    },
    [mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument],
  );

  const setNewDocument = useCallback(
    (documentType: DocumentType, documentId: string, newDocument: IDocument) => {
      switch (documentType) {
        case DocumentType.SOURCE_BODY:
          setSourceBodyDocument(newDocument);
          break;
        case DocumentType.TARGET_BODY:
          setTargetBodyDocument(newDocument);
          break;
        case DocumentType.PARAM:
          sourceParameterMap!.set(documentId, newDocument);
          refreshSourceParameters();
          break;
      }
    },
    [refreshSourceParameters, sourceParameterMap],
  );

  const [updatingDocument, setUpdatingDocument] = useState<boolean>(false);
  const updateDocumentDefinition = useCallback(
    (definition: DocumentDefinition) => {
      setUpdatingDocument(true);
      return DocumentService.createDocument(definition)
        .then((document) => {
          if (!document) return;
          removeStaleMappings(document.documentType, document.documentId, document);
          setNewDocument(document.documentType, document.documentId, document);
          onUpdateDocument && onUpdateDocument(definition);
        })
        .finally(() => setUpdatingDocument(false));
    },
    [onUpdateDocument, removeStaleMappings, setNewDocument],
  );

  const value = useMemo(() => {
    return {
      activeView,
      setActiveView,
      sourceParameterMap,
      isSourceParametersExpanded,
      setSourceParametersExpanded,
      refreshSourceParameters,
      sourceBodyDocument,
      setSourceBodyDocument,
      targetBodyDocument,
      setTargetBodyDocument,
      updateDocumentDefinition,
      mappingTree,
      refreshMappingTree,
      setMappingTree,
      debug,
      setDebug,
    };
  }, [
    activeView,
    sourceParameterMap,
    isSourceParametersExpanded,
    refreshSourceParameters,
    sourceBodyDocument,
    targetBodyDocument,
    updateDocumentDefinition,
    mappingTree,
    refreshMappingTree,
    debug,
  ]);

  return (
    <DataMapperContext.Provider value={value}>
      {initializingDocument || initializingMapping || updatingDocument ? <Loading /> : children}
    </DataMapperContext.Provider>
  );
};