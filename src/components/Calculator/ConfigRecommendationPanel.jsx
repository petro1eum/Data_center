import React from 'react';
import {
  Card,
  Space,
  Typography,
  Segmented,
  Button,
  Alert,
  Descriptions,
  Tag,
  Spin,
  List,
} from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  ThunderboltOutlined,
  LikeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const formatCurrency = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num));
};

const formatNumber = (num, precision = 0) => {
  if (num === null || num === undefined || Number.isNaN(num)) return 'N/A';
  if (num >= 10000) {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: precision }).format(num / 1000)} тыс`;
  }
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: precision }).format(num);
};

const GOAL_ICONS = {
  price: <DollarCircleOutlined />,
  speed: <ThunderboltOutlined />,
  quality: <LikeOutlined />,
};

const ConfigSummary = ({ config, currentTco, currentScore, onApply, applyLabel, applyDisabled }) => (
  <>
    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 12 }}>
      <Descriptions.Item label="GPU">{config.gpuName}</Descriptions.Item>
      <Descriptions.Item label="Сервер">{config.serverName}</Descriptions.Item>
      <Descriptions.Item label="Точность">{config.precision}-bit</Descriptions.Item>
      <Descriptions.Item label="GPU / Серверов">
        {config.requiredGpu} GPU / {config.serversRequired} серв.
      </Descriptions.Item>
      <Descriptions.Item label="TCO (5 лет)">
        <Text strong style={{ color: '#047857' }}>{formatCurrency(config.fiveYearTco)}</Text>
        {currentTco > 0 && (config.savingsVsCurrent ?? 0) > 0 && (
          <Text type="secondary"> (экономия ~{formatCurrency(config.savingsVsCurrent)})</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="Рейтинг">
        <Tag color={config.ratingScore >= 75 ? 'success' : config.ratingScore >= 50 ? 'blue' : 'warning'}>
          {config.ratingScore}/100 — {config.ratingLabel}
        </Tag>
        {typeof currentScore === 'number' && currentScore < config.ratingScore && (
          <Text type="secondary"> (сейчас {currentScore}/100)</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="Производительность" span={2}>
        ~{formatNumber(config.totalEffectiveTokensPerSec, 0)} tok/s
      </Descriptions.Item>
    </Descriptions>
    <Button
      type="primary"
      icon={<CheckCircleOutlined />}
      onClick={() => onApply(config)}
      disabled={applyDisabled}
    >
      {applyLabel}
    </Button>
  </>
);

/**
 * Главный блок продукта: подбор GPU+сервер+точность под модель и нагрузку.
 * Всегда на виду над вкладками результатов.
 */
const ConfigRecommendationPanel = ({
  recommendedConfig,
  recommendedAlternatives = [],
  isSearchingOptimal,
  recommendedError,
  optimalSearchNote,
  findOptimalHardwareConfig,
  applyRecommendedConfig,
  optimizationGoal,
  setOptimizationGoal,
  optimizationGoals,
  currentTco,
  currentScore,
}) => (
  <Card
    style={{
      marginBottom: 16,
      border: '2px solid #ef4444',
      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
    }}
    styles={{
      header: { background: 'linear-gradient(135deg, #fff1f2 0%, #ecfdf5 100%)' },
      body: { paddingTop: 16 },
    }}
    title={(
      <Space>
        <BulbOutlined style={{ color: '#ef4444', fontSize: 18 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>Подбор конфигурации под вашу нагрузку</span>
      </Space>
    )}
  >
    <Paragraph style={{ marginBottom: 16 }}>
      Выберите приоритет — система переберёт все GPU, серверы и точности и предложит лучший вариант.
      Подбор обновляется автоматически при изменении модели или нагрузки.
    </Paragraph>

    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>Приоритет:</Text>
        <Segmented
          size="large"
          block
          value={optimizationGoal ?? 'quality'}
          onChange={setOptimizationGoal}
          options={Object.values(optimizationGoals ?? {}).map((g) => ({
            label: (
              <Space size="small">
                {GOAL_ICONS[g.id]}
                {g.label}
              </Space>
            ),
            value: g.id,
          }))}
        />
      </div>

      <Space wrap>
        <Button
          type="primary"
          size="large"
          icon={<BulbOutlined />}
          onClick={findOptimalHardwareConfig}
          loading={isSearchingOptimal}
        >
          Подобрать конфигурацию
        </Button>
        <Button
          size="large"
          icon={<ReloadOutlined />}
          onClick={findOptimalHardwareConfig}
          loading={isSearchingOptimal}
        >
          Обновить
        </Button>
      </Space>
    </Space>

    {recommendedError && (
      <Alert type="error" showIcon message={recommendedError} style={{ marginTop: 16 }} />
    )}
    {optimalSearchNote && !recommendedError && (
      <Alert
        type={recommendedConfig?.isCurrentOptimal ? 'success' : 'info'}
        showIcon
        message={optimalSearchNote}
        style={{ marginTop: 16 }}
      />
    )}

    <Spin spinning={isSearchingOptimal && !recommendedConfig} tip="Перебор конфигураций...">
      {recommendedConfig && (
        <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
          <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
            {recommendedConfig.isCurrentOptimal
              ? 'Текущая конфигурация (оптимальна для выбранного приоритета)'
              : 'Рекомендуемая конфигурация'}
          </Text>
          <ConfigSummary
            config={recommendedConfig}
            currentTco={currentTco}
            currentScore={currentScore}
            onApply={applyRecommendedConfig}
            applyLabel={recommendedConfig.isCurrentOptimal ? 'Уже применена' : 'Применить к расчёту'}
            applyDisabled={recommendedConfig.isCurrentOptimal}
          />
        </div>
      )}

      {recommendedAlternatives.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Альтернативы (фронт Pareto — другие компромиссы цена / скорость / качество):
          </Text>
          <List
            size="small"
            bordered
            dataSource={recommendedAlternatives}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="apply" type="link" onClick={() => applyRecommendedConfig(item)}>
                    Применить
                  </Button>,
                ]}
              >
                <Space direction="vertical" size={0}>
                  <Text>
                    <strong>{item.gpuName}</strong> · {item.serverName} · {item.precision}-bit
                  </Text>
                  <Text type="secondary">
                    TCO {formatCurrency(item.fiveYearTco)} · {formatNumber(item.totalEffectiveTokensPerSec, 0)} tok/s · {item.ratingScore}/100
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </Spin>
  </Card>
);

export default ConfigRecommendationPanel;
