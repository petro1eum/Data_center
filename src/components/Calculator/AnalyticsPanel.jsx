import React from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Divider, Tooltip, Space, Descriptions, Tag } from 'antd';
import {
  DollarCircleOutlined, 
  FieldTimeOutlined, 
  UserOutlined, 
  ThunderboltOutlined, 
  InfoCircleOutlined,
  BarChartOutlined,
  HddOutlined,
  DeploymentUnitOutlined,
  InteractionOutlined,
  RiseOutlined,
  FallOutlined,
  PieChartOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// Вспомогательная функция для безопасного деления
const safeDivide = (numerator, denominator) => {
    if (denominator === 0 || !denominator) return 0;
    return numerator / denominator;
};

// Компонент для отображения метрики с иконкой и тултипом
const KpiCard = ({ title, tooltip, value, prefix, suffix, precision = 0, color, icon }) => (
    <Card 
        hoverable 
        size="small" 
        styles={{ body: { padding: '12px 16px' } }}
    >
        <Statistic
            title={<Tooltip title={tooltip}><Space size="small">{icon}{title}</Space></Tooltip>}
            value={value}
            precision={precision}
            prefix={prefix}
            suffix={suffix}
            valueStyle={{ color: color || '#1890ff', fontSize: 18, fontWeight: 500 }}
        />
    </Card>
);

/**
 * Компонент вкладки "Аналитика" (Переработанный)
 */
const AnalyticsPanel = ({ results, formData }) => {
    // --- Расчет метрик --- 
    const { 
        requiredGpu, capexUsd, annualOpexUsd, fiveYearTco, serversRequired, 
        powerConsumptionKw, totalGpuCost, totalServerCost, energyCostAnnual, 
        maintenanceCostAnnual, ramRequirementPerServerGB, networkCost, storageCostUsd, totalRamCost
    } = results;
    const { 
        userLoadConcurrentUsers, userLoadTokensPerRequest, userLoadResponseTimeSec, 
        gpuConfigModel, gpuConfigVramGb, serverConfigNumGpuPerServer, modelParamsNumBillion,
        modelParamsBitsPrecision, batchingOptimizationFactor,
        modelParamsTokensPerSecPerGpu
    } = formData;

    // Экономика
    const totalTokensPerSecondSystem = safeDivide(userLoadConcurrentUsers * userLoadTokensPerRequest, userLoadResponseTimeSec);
    const totalTokensOver5Years = totalTokensPerSecondSystem * 60 * 60 * 24 * 365 * 5;
    const costPerMillionTokens = safeDivide(fiveYearTco * 1000000, totalTokensOver5Years);
    const capexPerUser = safeDivide(capexUsd, userLoadConcurrentUsers);
    const opexPerUserAnnual = safeDivide(annualOpexUsd, userLoadConcurrentUsers);
    const tcoPerUser5yr = safeDivide(fiveYearTco, userLoadConcurrentUsers);
    const costPerGpu = safeDivide(totalGpuCost, requiredGpu);
    const costPerServer = safeDivide(totalServerCost, serversRequired);

    // Производительность
    const tokensPerSecondPerUser = safeDivide(userLoadTokensPerRequest, userLoadResponseTimeSec);
    const usersPerGpu = safeDivide(userLoadConcurrentUsers, requiredGpu);
    const tokensPerGpuWithBatching = modelParamsTokensPerSecPerGpu * batchingOptimizationFactor;

    // Эффективность и утилизация
    const kwPerGpu = safeDivide(powerConsumptionKw, requiredGpu);
    const gpuSlotsAvailable = serversRequired * serverConfigNumGpuPerServer;
    const gpuUtilizationPercent = safeDivide(requiredGpu * 100, gpuSlotsAvailable);
    const totalRamAvailable = ramRequirementPerServerGB * serversRequired;
    const ramPerGpuRatio = safeDivide(totalRamAvailable, requiredGpu);

    // Структура затрат
    const totalCostForPercent = capexUsd + annualOpexUsd * 5;
    const capexPercent = safeDivide(capexUsd * 100, totalCostForPercent);
    const opexPercent = 100 - capexPercent;
    const energyCostPercentOfOpex = safeDivide(energyCostAnnual * 100, annualOpexUsd);
    const maintenanceCostPercentOfOpex = safeDivide(maintenanceCostAnnual * 100, annualOpexUsd);
    const gpuCostPercentOfCapex = safeDivide(totalGpuCost * 100, capexUsd);
    const serverCostPercentOfCapex = safeDivide(totalServerCost * 100, capexUsd);
    const networkCostPercentOfCapex = safeDivide(networkCost * 100, capexUsd);
    const storageCostPercentOfCapex = safeDivide(storageCostUsd * 100, capexUsd);
    const ramCostPercentOfCapex = safeDivide(totalRamCost * 100, capexUsd);
    
    // --- Рендеринг --- 
    return (
        <Card variant="borderless" style={{ background: '#f9f9f9' }} styles={{ body: { padding: '16px 20px' } }}>
            <Title level={4} style={{ marginBottom: 8 }}>Аналитика и KPI</Title>
            <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                Ключевые показатели эффективности (KPI), экономические метрики и анализ структуры затрат для выбранной конфигурации.
            </Paragraph>

            {/* --- Блок Ключевых Экономических KPI --- */} 
            <Title level={5}><DollarCircleOutlined style={{ marginRight: 8, color: '#fa8c16' }}/>Экономика (на пользователя)</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="Стоимость / 1M токенов"
                        tooltip="Оценочная стоимость обработки 1 миллиона токенов (на базе TCO за 5 лет)"
                        value={costPerMillionTokens}
                        prefix="$"
                        suffix="/1M tok"
                        precision={0}
                        color="#d4380d"
                        icon={<DollarCircleOutlined />}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="TCO / Пользователь (5 лет)"
                        tooltip="Общая стоимость владения за 5 лет в расчете на одного одновременного пользователя"
                        value={tcoPerUser5yr}
                        prefix="$"
                        precision={0}
                        color="#cf1322"
                        icon={<UserOutlined />}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="CapEx / Пользователь"
                        tooltip="Первоначальные инвестиции в расчете на одного одновременного пользователя"
                        value={capexPerUser}
                        prefix="$"
                        precision={0}
                        color="#096dd9"
                        icon={<RiseOutlined />}
                    />
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="OpEx / Пользователь (Год)"
                        tooltip="Ежегодные операционные расходы в расчете на одного одновременного пользователя"
                        value={opexPerUserAnnual}
                        prefix="$"
                        precision={0}
                        color="#d46b08"
                        icon={<FallOutlined />}
                    />
                </Col>
            </Row>
            <Divider />

            {/* --- Блок Производительности и Эффективности --- */} 
            <Title level={5}><BarChartOutlined style={{ marginRight: 8, color: '#52c41a' }}/>Производительность и Эффективность</Title>
             <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="Токены / Сек / Польз."
                        tooltip="Средняя скорость генерации токенов для одного пользователя"
                        value={tokensPerSecondPerUser}
                        precision={1}
                        suffix="ток/с"
                        color="#237804"
                        icon={<FieldTimeOutlined />}
                    />
                </Col>
                 <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="Пользователи / GPU"
                        tooltip="Количество одновременных пользователей, обслуживаемых одним GPU"
                        value={usersPerGpu}
                        precision={1}
                        suffix="польз."
                        color="#391085"
                        icon={<InteractionOutlined />}
                    />
                </Col>
                 <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="Мощность / GPU"
                        tooltip="Среднее энергопотребление на один GPU (включая долю серверной обвязки)"
                        value={kwPerGpu}
                        precision={2}
                        suffix="кВт"
                        color="#ad6800"
                        icon={<ThunderboltOutlined />}
                    />
                 </Col>
                 <Col xs={24} sm={12} md={6}>
                    <KpiCard 
                        title="RAM / GPU"
                        tooltip="Соотношение общего объема RAM к общему количеству GPU в системе"
                        value={ramPerGpuRatio}
                        precision={1}
                        suffix="ГБ RAM / GPU"
                        color="#0050b3"
                        icon={<HddOutlined />}
                    />
                </Col>
            </Row>
            <Divider />

             {/* --- Блок Структуры Затрат и Утилизации --- */} 
             <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                    <Card title={<><PieChartOutlined style={{ marginRight: 8 }} />Структура TCO (5 лет)</>} size="small" hoverable>
                       <Row gutter={16} align="middle" justify="center">
                           <Col xs={12} sm={10} style={{ textAlign: 'center' }}>
                                <Progress 
                                    type="circle" 
                                    percent={capexPercent} 
                                    format={(percent) => <><Text strong>{percent?.toFixed(0)}%</Text><br/><Text type="secondary">CapEx</Text></>}
                                    strokeColor="#1890ff"
                                    trailColor="#fff0f6"
                                    size={100}
                                />
                           </Col>
                           <Col xs={12} sm={10} style={{ textAlign: 'center' }}>
                                <Progress 
                                    type="circle" 
                                    percent={opexPercent} 
                                    format={(percent) => <><Text strong>{percent?.toFixed(0)}%</Text><br/><Text type="secondary">OpEx</Text></>}
                                    strokeColor="#fa8c16"
                                    trailColor="#fffbe6"
                                    size={100}
                                />
                           </Col>
                           <Col span={24} style={{ marginTop: 16 }}>
                               <Descriptions size="small" column={1} bordered layout="vertical">
                                    <Descriptions.Item label="CapEx Breakdown">
                                        <Space direction="vertical" size={2}>
                                            <Text>• GPU: {gpuCostPercentOfCapex.toFixed(1)}% (${totalGpuCost?.toLocaleString()})</Text>
                                            <Text>• Серверы: {serverCostPercentOfCapex.toFixed(1)}% (${totalServerCost?.toLocaleString()})</Text>
                                            <Text>• Сеть: {networkCostPercentOfCapex.toFixed(1)}% (${networkCost.toLocaleString()})</Text>
                                            <Text>• RAM: {ramCostPercentOfCapex.toFixed(1)}% (${totalRamCost.toLocaleString()})</Text>
                                            <Text>• Хранилище: {storageCostPercentOfCapex.toFixed(1)}% (${storageCostUsd.toLocaleString()})</Text>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="OpEx Breakdown (Annual)">
                                         <Space direction="vertical" size={2}>
                                            <Text>• Энергия: {energyCostPercentOfOpex.toFixed(1)}% (${energyCostAnnual.toLocaleString()})</Text>
                                            <Text>• Обслуживание: {maintenanceCostPercentOfOpex.toFixed(1)}% (${maintenanceCostAnnual.toLocaleString()})</Text>
                                        </Space>
                                    </Descriptions.Item>
                                </Descriptions>
                           </Col>
                       </Row>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={<><DeploymentUnitOutlined style={{ marginRight: 8 }} />Утилизация Ресурсов</>} size="small" hoverable>
                       <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <div>
                                <Text strong>Утилизация GPU слотов: </Text>
                                <Tag color={gpuUtilizationPercent < 70 ? "warning" : "success"}>{(requiredGpu / serverConfigNumGpuPerServer).toFixed(1)} / {serversRequired} серверов</Tag>
                                <Progress 
                                    percent={gpuUtilizationPercent}
                                    strokeColor={gpuUtilizationPercent < 70 ? "#faad14" : "#52c41a"}
                                    format={(p) => `${p?.toFixed(1)}% (${requiredGpu} / ${gpuSlotsAvailable} слотов)`}
                                    status={gpuUtilizationPercent === 100 ? "success" : "active"}
                                />
                                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                                    Показывает, насколько эффективно используются доступные слоты GPU в рассчитанных серверах.
                                    Низкий процент может указывать на неоптимальное количество GPU на сервер.
                                </Paragraph>
                            </div>
                            <Divider style={{ margin: '8px 0'}}/>
                             <div>
                                <Text strong>Параметры нагрузки и конфигурации:</Text>
                                <Descriptions bordered size="small" column={1} style={{ marginTop: 8}} >
                                    <Descriptions.Item label={<><UserOutlined /> Пользователи</>}>{userLoadConcurrentUsers.toLocaleString()}</Descriptions.Item>
                                    <Descriptions.Item label={<><DatabaseOutlined /> Модель</>}>{`${modelParamsNumBillion}B (${modelParamsBitsPrecision}-бит)`}</Descriptions.Item>
                                    <Descriptions.Item label={<><InteractionOutlined /> Коэфф. батчинга</>}>{batchingOptimizationFactor}x</Descriptions.Item>
                                    <Descriptions.Item label={<><DeploymentUnitOutlined /> GPU на сервер</>}>{serverConfigNumGpuPerServer}</Descriptions.Item>
                                    <Descriptions.Item label={<><InfoCircleOutlined/> Токены/запрос</>}>{userLoadTokensPerRequest}</Descriptions.Item>
                                    <Descriptions.Item label={<><FieldTimeOutlined/> Время ответа</>}>{userLoadResponseTimeSec} сек</Descriptions.Item>
                                </Descriptions>
                             </div>
                       </Space>
                    </Card>
                </Col>
            </Row>
        </Card>
    );
};

export default AnalyticsPanel; 