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
import { Button, Tooltip } from '@patternfly/react-core';
import { ChangeEvent, createRef, FunctionComponent, useCallback } from 'react';

import { ImportIcon } from '@patternfly/react-icons';
import { CommonUtil } from '../../../util';
import { XmlSchemaDocumentService } from '../../../services';
import { useDataMapper } from '../../../hooks';
import { MappingService } from '../../../services/mapping.service';
import { DocumentType } from '../../../models/path';
import { useCanvas } from '../../../hooks/useCanvas';

type AttachSchemaProps = {
  documentType: DocumentType;
  documentId: string;
  hasSchema?: boolean;
};

export const AttachSchemaButton: FunctionComponent<AttachSchemaProps> = ({
  documentType,
  documentId,
  hasSchema = false,
}) => {
  const {
    mappingTree,
    setMappingTree,
    sourceParameterMap,
    refreshSourceParameters,
    setSourceBodyDocument,
    setTargetBodyDocument,
  } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const fileInputRef = createRef<HTMLInputElement>();

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0);
      if (!file) return;
      CommonUtil.readFileAsString(file).then((content) => {
        const document = XmlSchemaDocumentService.createXmlSchemaDocument(documentType, documentId, content);
        if (hasSchema) {
          const cleaned = MappingService.removeStaleMappingsForDocument(mappingTree, document);
          setMappingTree(cleaned);
        } else {
          const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, documentType, documentId);
          setMappingTree(cleaned);
        }
        switch (documentType) {
          case DocumentType.SOURCE_BODY:
            setSourceBodyDocument(document);
            break;
          case DocumentType.TARGET_BODY:
            setTargetBodyDocument(document);
            break;
          case DocumentType.PARAM:
            sourceParameterMap.set(documentId, document);
            refreshSourceParameters();
            break;
        }
        clearNodeReferencesForDocument(documentType, documentId);
        reloadNodeReferences();
      });
    },
    [
      clearNodeReferencesForDocument,
      documentId,
      documentType,
      hasSchema,
      mappingTree,
      refreshSourceParameters,
      reloadNodeReferences,
      setMappingTree,
      setSourceBodyDocument,
      setTargetBodyDocument,
      sourceParameterMap,
    ],
  );

  return (
    <Tooltip position={'auto'} enableFlip={true} content={<div>{hasSchema ? 'Update schema' : 'Attach a schema'}</div>}>
      <Button
        variant="plain"
        aria-label={hasSchema ? 'Update schema' : 'Attach schema'}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={onClick}
      >
        <ImportIcon />
        <input
          type="file"
          style={{ display: 'none' }}
          data-testid={`attach-schema-${documentType}-${documentId}-file-input`}
          onChange={onImport}
          accept=".xml, .xsd"
          ref={fileInputRef}
        />
      </Button>
    </Tooltip>
  );
};