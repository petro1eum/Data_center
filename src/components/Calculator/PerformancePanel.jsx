import React, { useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Alert,
  Space,
  Tooltip,
  Progress,
} from 'antd';
import {
  ThunderboltOutlined,
  DashboardOutlined,
  HddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { GPU_PRESETS } from '../../data/gpuPresets';
import { MODEL_PRESETS } from '../../data/modelPresets';
import { getCloudApiThroughput } from '../../data/openRouterBenchmarks';
import {
  buildGpuBenchmarkForModel,
  buildModelBenchmarkForGpu,
  buildClusterThroughputMetrics,
  buildSingleConfigMetrics,
} from '../../utils/performanceBenchmark';

const { Title, Text, Paragraph } = Typography;

const formatTps = (v) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v));

const PerformancePanel = ({
  formData,
  results,
  selectedModelPreset,
  selectedGpuPreset,
  performanceWarning,
}) => {
  const precision = formData.modelParamsBitsPrecision ?? 16;
  const batching = formData.batchingOptimizationFactor ?? 1;

  const currentMetrics = useMemo(() => {
    if (!selectedModelPreset || !selectedGpuPreset) return null;
    return buildSingleConfigMetrics({
      modelId: selectedModelPreset,
      gpuId: selectedGpuPreset,
      precision,
      batchingFactor: batching,
      formData,
    });
  }, [selectedModelPreset, selectedGpuPreset, precision, batching, formData]);

  const gpuBenchmark = useMemo(
    () =>
      selectedModelPreset
        ? buildGpuBenchmarkForModel({
            modelId: selectedModelPreset,
            precision,
            batchingFactor: batching,
            formData,
            currentGpuId: selectedGpuPreset,
          })
        : [],
    [selectedModelPreset, selectedGpuPreset, precision, batching, formData],
  );

  const modelBenchmark = useMemo(
    () =>
      selectedGpuPreset
        ? buildModelBenchmarkForGpu({
            gpuId: selectedGpuPreset,
            precision,
            batchingFactor: batching,
            currentModelId: selectedModelPreset,
          })
        : [],
    [selectedGpuPreset, selectedModelPreset, precision, batching],
  );

  const clusterMetrics = useMemo(
    () =>
      buildClusterThroughputMetrics({
        tpsPerGpu: results.estimatedTokensPerSecPerGpu,
        batchingFactor: batching,
        requiredGpu: results.requiredGpu,
        totalEffectiveTokensPerSec: results.totalEffectiveTokensPerSec,
        userLoadConcurrentUsers: formData.userLoadConcurrentUsers,
        userLoadTokensPerRequest: formData.userLoadTokensPerRequest,
        userLoadResponseTimeSec: formData.userLoadResponseTimeSec,
        gpusPerReplica: results.gpusPerReplica,
      }),
    [results, formData, batching],
  );

  const chartData = useMemo(
    () =>
      gpuBenchmark.slice(0, 12).map((r) => ({
        gpu: r.gpuName.replace(/NVIDIA |AMD Instinct /, ''),
        tps: r.tpsEffective,
        isCurrent: r.isCurrent,
      })),
    [gpuBenchmark],
  );

  const gpuColumns = [
    {
      title: 'GPU',
      dataIndex: 'gpuName',
      key: 'gpu',
      render: (name, row) => (
        <Space>
          {row.isCurrent && <Tag color="blue">текущий</Tag>}
          <Text strong={row.isCurrent}>{name}</Text>
        </Space>
      ),
    },
    {
      title: (
        <Tooltip title="Decode throughput на 1 GPU (output tokens/sec)">
          tok/s/GPU <InfoCircleOutlined />
        </Tooltip>
      ),
      dataIndex: 'tpsEffective',
      key: 'tps',
      sorter: (a, b) => a.tpsEffective - b.tpsEffective,
      defaultSortOrder: 'descend',
      render: (v, row) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatTps(v)}</Text>
          {batching !== 1 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              base {formatTps(row.tpsPerGpu)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'ms/token',
      dataIndex: 'msPerToken',
      key: 'ms',
      sorter: (a, b) => a.msPerToken - b.msPerToken,
      render: (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1)),
    },
    {
      title: 'tok/min',
      dataIndex: 'tokensPerMinute',
      key: 'tpm',
      render: (v) => formatTps(v),
    },
    {
      title: 'VRAM',
      key: 'vram',
      render: (_, row) => (
        <Space>
          {row.fitsVram ? (
            <CheckCircleOutlined style={{ color: '#047857' }} />
          ) : (
            <Tooltip title={row.vramWarning ?? 'Не помещается'}>
              <CloseCircleOutlined style={{ color: '#dc2626' }} />
            </Tooltip>
          )}
          <Text type="secondary">
            {row.gpusPerReplica > 1 ? `TP×${row.gpusPerReplica}` : '1 GPU'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'vs best',
      dataIndex: 'relativeToBest',
      key: 'rel',
      width: 120,
      render: (pct) => (
        <Progress
          percent={pct}
          size="small"
          showInfo={false}
          strokeColor={pct >= 90 ? '#047857' : pct >= 60 ? '#f97316' : '#ef4444'}
        />
      ),
    },
    {
      title: '',
      key: 'est',
      width: 48,
      render: (_, row) =>
        row.estimated ? (
          <Tooltip title="Экстраполяция по классу GPU">
            <Tag>~est</Tag>
          </Tooltip>
        ) : null,
    },
  ];

  const modelColumns = [
    {
      title: 'Модель',
      dataIndex: 'modelName',
      key: 'model',
      render: (name, row) => (
        <Space>
          {row.isCurrent && <Tag color="blue">текущая</Tag>}
          <Text strong={row.isCurrent}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'tok/s/GPU',
      dataIndex: 'tpsEffective',
      key: 'tps',
      sorter: (a, b) => a.tpsEffective - b.tpsEffective,
      render: (v) => <Text strong>{formatTps(v)}</Text>,
    },
    {
      title: 'ms/token',
      dataIndex: 'msPerToken',
      key: 'ms',
      render: (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1)),
    },
    {
      title: 'VRAM',
      key: 'vram',
      render: (_, row) =>
        row.fitsVram ? (
          <Tag color="success">OK</Tag>
        ) : (
          <Tag color="error">TP×{row.gpusPerReplica}</Tag>
        ),
    },
  ];

  if (!selectedModelPreset) {
    return (
      <Alert
        type="info"
        showIcon
        message="Выберите модель LLM для оценки скорости генерации"
      />
    );
  }

  const modelName = MODEL_PRESETS[selectedModelPreset]?.name ?? selectedModelPreset;
  const gpuName = selectedGpuPreset ? GPU_PRESETS[selectedGpuPreset]?.name : '—';

  return (
    <div style={{ width: '100%' }}>
      <Title level={4}>
        <ThunderboltOutlined style={{ marginRight: 8, color: '#f97316' }} />
        Скорость генерации (throughput)
      </Title>
      <Paragraph type="secondary">
        {formData.performanceMode === 'cloud_api'
          ? `Cloud API (OpenRouter median @ 10K ctx) — ${precision}-bit deploy`
          : `On-prem peak decode (vLLM batch) — ${precision}-bit`}
        {batching !== 1 && `, батчинг ×${batching}`}.
        {formData.performanceMode === 'cloud_api' && results.onPremTokensPerSecPerGpu && (
          <> On-prem peak для CapEx: <strong>{formatTps(results.onPremTokensPerSecPerGpu)}</strong> tok/s/GPU.</>
        )}
      </Paragraph>

      {selectedModelPreset && (() => {
        const cloud = getCloudApiThroughput(selectedModelPreset);
        if (!cloud) return null;
        const onPrem = results.onPremTokensPerSecPerGpu ?? results.estimatedTokensPerSecPerGpu;
        const ratio = onPrem && cloud.median ? (onPrem / cloud.median).toFixed(1) : null;
        return (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`OpenRouter cloud: ${cloud.median} tok/s median (${cloud.provider})${cloud.best ? `, best ${cloud.best}` : ''}`}
            description={
              ratio
                ? `On-prem / cloud ≈ ×${ratio}. Cloud — shared API + 10K input; on-prem — dedicated GPU batch.`
                : cloud.note
            }
          />
        );
      })()}

      {performanceWarning && (
        <Alert type="warning" showIcon message={performanceWarning} style={{ marginBottom: 16 }} closable />
      )}

      {/* Текущая конфигурация + кластер */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size="small" title={`${modelName} × ${gpuName}`} hoverable>
            {currentMetrics ? (
              <Row gutter={[8, 12]}>
                <Col span={12}>
                  <Text type="secondary">1 GPU decode</Text>
                  <div>
                    <Text style={{ fontSize: 22, fontWeight: 600, color: '#ef4444' }}>
                      {formatTps(currentMetrics.tpsEffective)}
                    </Text>
                    <Text type="secondary"> tok/s</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Latency (1 stream)</Text>
                  <div>
                    <Text style={{ fontSize: 22, fontWeight: 600 }}>
                      {currentMetrics.msPerToken < 1
                        ? currentMetrics.msPerToken.toFixed(2)
                        : currentMetrics.msPerToken.toFixed(1)}
                    </Text>
                    <Text type="secondary"> ms/token</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">tok/min/GPU</Text>
                  <div>
                    <Text strong>{formatTps(currentMetrics.tokensPerMinute)}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Tensor parallel</Text>
                  <div>
                    <Text strong>{currentMetrics.gpusPerReplica} GPU</Text>
                    {currentMetrics.estimated && (
                      <Tag style={{ marginLeft: 4 }}>~est</Tag>
                    )}
                  </div>
                </Col>
              </Row>
            ) : (
              <Text type="secondary">Нет данных производительности для этой пары</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={
              <>
                <DashboardOutlined style={{ marginRight: 6 }} />
                Кластер ({results.requiredGpu ?? 0} GPU)
              </>
            }
            hoverable
          >
            <Row gutter={[8, 12]}>
              <Col span={12}>
                <Text type="secondary">Суммарный throughput</Text>
                <div>
                  <Text style={{ fontSize: 22, fontWeight: 600, color: '#3b82f6' }}>
                    {formatTps(clusterMetrics.clusterTps)}
                  </Text>
                  <Text type="secondary"> tok/s</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">tok/min (кластер)</Text>
                <div>
                  <Text strong>{formatTps(clusterMetrics.tokensPerMinuteCluster)}</Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Max users @ SLA</Text>
                <div>
                  <Text strong>
                    {clusterMetrics.maxConcurrentUsersAtSla ?? '—'}
                  </Text>
                  <Text type="secondary">
                    {' '}
                    / {formData.userLoadConcurrentUsers} задано
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Нагрузка vs capacity</Text>
                <div>
                  {clusterMetrics.utilizationVsLoad != null ? (
                    <Progress
                      percent={Math.min(clusterMetrics.utilizationVsLoad, 150)}
                      size="small"
                      status={
                        clusterMetrics.utilizationVsLoad > 100 ? 'exception' : 'active'
                      }
                      format={() => `${clusterMetrics.utilizationVsLoad}%`}
                    />
                  ) : (
                    '—'
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card
          size="small"
          title={`GPU ranking: ${modelName}`}
          style={{ marginBottom: 24 }}
        >
          <Column
            data={chartData}
            xField="gpu"
            yField="tps"
            height={220}
            style={{
              fill: (d) => (d.isCurrent ? '#ef4444' : '#fca5a5'),
            }}
            axis={{ y: { title: 'tok/s (× batching)' } }}
            tooltip={{
              title: (d) => d.gpu,
              items: [{ field: 'tps', name: 'tok/s/GPU' }],
            }}
            label={{
              text: (d) => formatTps(d.tps),
              position: 'top',
              style: { fontSize: 10 },
            }}
          />
        </Card>
      )}

      {/* GPU table for model */}
      <Card
        size="small"
        title={
          <>
            <HddOutlined style={{ marginRight: 6 }} />
            Все GPU для {modelName}
          </>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          dataSource={gpuBenchmark}
          columns={gpuColumns}
          rowKey="gpuId"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          rowClassName={(row) => (row.isCurrent ? 'perf-row-current' : '')}
        />
      </Card>

      {/* Models on current GPU */}
      {selectedGpuPreset && modelBenchmark.length > 0 && (
        <Card
          size="small"
          title={`Топ моделей на ${gpuName}`}
        >
          <Table
            dataSource={modelBenchmark}
            columns={modelColumns}
            rowKey="modelId"
            size="small"
            pagination={false}
            rowClassName={(row) => (row.isCurrent ? 'perf-row-current' : '')}
          />
        </Card>
      )}

      <style>{`
        .perf-row-current { background: #fff1f2 !important; }
      `}</style>
    </div>
  );
};

export default PerformancePanel;
