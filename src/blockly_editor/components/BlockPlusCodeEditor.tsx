import React from 'react';
import BlocklyEditor from './BlocklyEditor'; // adjust path if needed
import CodeEditor from '@/python_code_editor/components/CodeEditor';

interface BlockPlusTextEditorProps {
    controllerCodeMap: Record<string, string>;
    activeControllerId: string | null;
    setControllerCodeMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    stopSimulation: () => void;
}

export default function BlockPlusTextEditor({
    controllerCodeMap,
    activeControllerId,
    setControllerCodeMap,
    stopSimulation,
}: BlockPlusTextEditorProps) {
    return (
        <div className="flex flex-row w-full h-full gap-2 min-h-[400px]">
            {/* Block Editor side */}
            <div className="flex-1 flex flex-col min-w-[240px] h-full border-r border-gray-200 pr-2">
                <BlocklyEditor />
            </div>

            {/* Code Editor side */}
            <div className="flex-1 flex flex-col min-w-[240px] h-full pl-2">
                <CodeEditor
                    code={controllerCodeMap[activeControllerId ?? ''] ?? ''}
                    onChange={(newCode) => {
                        if (!activeControllerId) return;
                        setControllerCodeMap((prev) => ({
                            ...prev,
                            [activeControllerId]: newCode,
                        }));
                        stopSimulation();
                    }}
                />
            </div>
        </div>
    );
}
