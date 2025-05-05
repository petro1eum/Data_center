import React from 'react';
import { Card, Table, Typography, Tag, Tooltip, Space } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MODEL_PRESETS } from '../../data/modelPresets'; // Единственный источник данных!

const { Paragraph, Text } = Typography;

// --- Генерация данных для таблицы --- (Напрямую из MODEL_PRESETS)
const llmData = Object.entries(MODEL_PRESETS).map(([key, preset]) => ({
    key: key,
    model: preset.name,
    developer: preset.developer || '-', // Используем данные из пресета
    params: preset.params,
    paramsValue: preset.params,
    context: preset.context || '-', // Используем данные из пресета
    contextValue: preset.contextValue || 0, // Используем данные из пресета
    license: preset.license || '-', // Используем данные из пресета
    toolCalls: preset.supports_tool_calls ? 'Да' : 'Нет',
    structuredOutput: preset.supports_tool_calls ? 'Да (вероятно)' : 'Нет',
    multimodality: preset.multimodality || 'Текст, Код', // Используем данные из пресета
    moe: preset.moe || 'Нет', // Используем данные из пресета
    optimizations: preset.optimizations || '-', // Используем данные из пресета
    // Используем описание из пресета
    description: preset.description || "Описание отсутствует.", 
}));

// --- Конфигурация колонок --- (Небольшие правки в render для лицензии)
const columns = [
    {
        title: 'Модель',
        dataIndex: 'model',
        key: 'model',
        sorter: (a, b) => a.model.localeCompare(b.model),
        fixed: 'left',
        width: 180,
    },
    {
        title: 'Парам. (млрд)',
        dataIndex: 'params',
        key: 'params',
        sorter: (a, b) => a.paramsValue - b.paramsValue,
        width: 100,
        align: 'right',
        defaultSortOrder: 'descend',
        render: (params) => params.toFixed(1)
    },
    {
        title: 'Разработчик',
        dataIndex: 'developer',
        key: 'developer',
        sorter: (a, b) => a.developer.localeCompare(b.developer),
        filters: [...new Set(llmData.map(item => item.developer).filter(dev => dev !== '-'))].sort().map(dev => ({ text: dev, value: dev })),
        onFilter: (value, record) => record.developer === value,
        width: 150,
    },
    {
        title: 'Контекст (max)',
        dataIndex: 'context',
        key: 'context',
        sorter: (a, b) => a.contextValue - b.contextValue,
        width: 130,
        render: (context) => (
            <Tooltip title="Максимальное количество токенов в одном вводе/выводе">
                <Tag>{context}</Tag>
            </Tooltip>
        )
    },
    {
        title: 'Лицензия',
        dataIndex: 'license',
        key: 'license',
        width: 150,
        filters: [...new Set(llmData.map(item => item.license).filter(lic => lic !== '-'))].sort().map(lic => ({ text: lic, value: lic })),
        onFilter: (value, record) => record.license === value,
        render: (license) => {
            let color = 'default';
            const lowerCaseLicense = String(license).toLowerCase();
            if (lowerCaseLicense.includes('apache') || lowerCaseLicense.includes('mit')) color = 'green';
            else if (lowerCaseLicense.includes('non-com')) color = 'volcano';
            else if (lowerCaseLicense.includes('permissive')) color = 'lime'; // Llama 2
            else if (lowerCaseLicense.includes('llama 3')) color = 'cyan'; // Llama 3 specific
            else if (lowerCaseLicense.includes('rail')) color = 'purple';
            else if (lowerCaseLicense.includes('qwen') || lowerCaseLicense.includes('yi') || lowerCaseLicense.includes('deepseek') || lowerCaseLicense.includes('tongyi')) color = 'orange';
            else if (license === '-') color = 'grey';
            return <Tag color={color} style={{ whiteSpace: 'normal', lineHeight: '1.2', maxWidth: '100%' }}>{license}</Tag>;
        },
    },
    {
        title: 'Поддержка',
        key: 'support',
        width: 150,
        filters: [
            { text: 'Tool Calls: Да', value: 'toolCallsYes' },
            { text: 'Tool Calls: Нет', value: 'toolCallsNo' },
            { text: 'MoE', value: 'moe' },
        ],
        onFilter: (value, record) => {
            if (value === 'toolCallsYes') return record.toolCalls === 'Да';
            if (value === 'toolCallsNo') return record.toolCalls === 'Нет';
            if (value === 'moe') return record.moe === 'Да';
            return false;
        },
        render: (_, record) => (
            <Space direction="vertical" size={2}>
                <Tag color={record.toolCalls === 'Да' ? 'success' : 'default'}>Tools: {record.toolCalls}</Tag>
                <Tag color={record.structuredOutput.includes('Да') ? 'processing' : 'default'}>StructOut: {record.structuredOutput}</Tag>
                {record.moe === 'Да' && <Tag color="magenta">MoE</Tag>}
            </Space>
        ),
    },
    {
        title: 'Мультимод.',
        dataIndex: 'multimodality',
        key: 'multimodality',
        width: 110,
        ellipsis: true,
        filters: [
            { text: 'Текст/Код', value: 'TextCode' },
            { text: 'Vision', value: 'Vision' },
            { text: 'Audio', value: 'Audio' },
        ],
        onFilter: (value, record) => {
            const modalities = record.multimodality.toLowerCase();
            if (value === 'TextCode') return modalities.includes('текст') || modalities.includes('код');
            if (value === 'Vision') return modalities.includes('vision') || modalities.includes('изображение');
            if (value === 'Audio') return modalities.includes('audio');
            return false;
        },
        render: (modalities) => (
             <Tooltip title={modalities} placement="topLeft">
                 <Tag color="geekblue">{modalities}</Tag>
             </Tooltip>
        )
    },
    {
        title: 'Оптимизации',
        dataIndex: 'optimizations',
        key: 'optimizations',
        ellipsis: {
            showTitle: false,
        },
        render: (optimisations) => {
            if (optimisations === '-') return '-';
            const optList = optimisations.split(',').map(opt => opt.trim()).filter(opt => opt);
            return (
                <Space size={[0, 4]} wrap>
                    {optList.map((opt, index) => (
                        <Tag color="purple" key={index}>{opt}</Tag>
                    ))}
                </Space>
            );
        },
        width: 200,
    },
];

const LlmHandbook = () => {
    return (
        <Card title="Справочник по LLM">
            <Paragraph>
                Этот раздел содержит структурированную информацию о моделях, доступных в пресетах калькулятора.
                Все данные берутся из файла <code>src/data/modelPresets.js</code>. Используйте фильтры и сортировку для анализа.
                Нажмите <Text strong>+</Text> слева от строки для просмотра описания модели.
            </Paragraph>
            <Table
                columns={columns}
                dataSource={llmData}
                rowKey="key"
                pagination={{ pageSize: 20, hideOnSinglePage: true, size: 'small' }}
                scroll={{ x: 'max-content' }}
                size="small"
                expandable={{
                    expandedRowRender: record => (
                        record.description && record.description !== '-' && !record.description.includes('отсутствует') ? (
                            <div style={{ padding: '10px 15px', margin: '5px 0', backgroundColor: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}
                                    components={{ // Уменьшаем заголовки внутри описания
                                        h3: ({node, ...props}) => <h4 style={{ marginTop: '1em', marginBottom: '0.5em' }} {...props} />,
                                        h4: ({node, ...props}) => <h5 style={{ marginTop: '1em', marginBottom: '0.5em' }} {...props} />,
                                        p: ({node, ...props}) => <p style={{ marginBottom: '0.5em' }} {...props} />,
                                     }}
                                >
                                    {`#### ${record.model}\n\n` + record.description} 
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div style={{ padding: '10px 15px' }}>
                               <Text type="secondary">Описание для этой модели отсутствует в пресетах.</Text>
                            </div>
                        )
                    ),
                    rowExpandable: record => true,
                }}
            />
        </Card>
    );
};

export default LlmHandbook;