import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.*;
import java.util.*;
import java.util.List;

public class FreightSimulator extends JFrame {
    // --- 定数設定 ---
    private static final double VOL_FACTOR = 6000.0;

    // --- UIコンポーネント ---
    private JComboBox<String> prefCombo;
    private JTextField charterField, assistField, modelInput;
    private JTable table;
    private DefaultTableModel tableModel;
    private JLabel resSagawa, resYamato, resKintetsu, resKintetsuDetail;
    private JLabel totalWeightLabel;

    // --- エリアマスタ ---
    private final Map<String, String> prefToArea = new HashMap<>();

    public FreightSimulator() {
        setTitle("運賃比較シミュレーター (Java完全版)");
        setSize(1100, 750);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        initAreaMaster();
        initUI();
    }

    private void initAreaMaster() {
        String[] prefs = {"北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"};
        for (String p : prefs) {
            String area = "関東";
            if (p.equals("北海道")) area = "北海道";
            else if (Arrays.asList("青森県","岩手県","秋田県").contains(p)) area = "北東北";
            else if (Arrays.asList("宮城県","山形県","福島県").contains(p)) area = "南東北";
            else if (Arrays.asList("新潟県","富山県","石川県","福井県").contains(p)) area = "北陸";
            else if (Arrays.asList("山梨県","長野県").contains(p)) area = "甲信越";
            else if (Arrays.asList("岐阜県","静岡県","愛知県","三重県").contains(p)) area = "中部";
            else if (Arrays.asList("滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県").contains(p)) area = "関西";
            else if (Arrays.asList("鳥取県","島根県","岡山県","広島県","山口県").contains(p)) area = "中国";
            else if (Arrays.asList("徳島県","香川県","愛媛県","高知県").contains(p)) area = "四国";
            // 佐川分割用
            else if (Arrays.asList("福岡県","佐賀県","長崎県","大分県").contains(p)) area = "北九州";
            else if (Arrays.asList("熊本県","宮崎県","鹿児島県").contains(p)) area = "南九州";
            else if (p.equals("沖縄県")) area = "沖縄";
            prefToArea.put(p, area);
        }
    }

    private void initUI() {
        setLayout(new BorderLayout(10, 10));

        // --- 上部パネル（設定エリア） ---
        JPanel topPanel = new JPanel(new GridLayout(2, 1));
        JPanel configPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 5));
        configPanel.setBorder(BorderFactory.createTitledBorder("基本設定"));

        prefCombo = new JComboBox<>(prefToArea.keySet().stream().sorted().toArray(String[]::new));
        charterField = new JTextField("21500", 7);
        assistField = new JTextField("15000", 7);

        configPanel.add(new JLabel("配送先:")); configPanel.add(prefCombo);
        configPanel.add(new JLabel("チャーター費(円):")); configPanel.add(charterField);
        configPanel.add(new JLabel("助手費(円):")); configPanel.add(assistField);

        JPanel actionPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 5));
        modelInput = new JTextField(15);
        JButton btnAdd = new JButton("行追加");
        btnAdd.addActionListener(e -> addNewRow());
        
        actionPanel.add(new JLabel("型番入力:")); actionPanel.add(modelInput);
        actionPanel.add(btnAdd);

        topPanel.add(configPanel);
        topPanel.add(actionPanel);
        add(topPanel, BorderLayout.NORTH);

        // --- 中央テーブル ---
        String[] columns = {"No", "型番", "数量", "縦(mm)", "横(mm)", "高(mm)", "3辺計", "実重(kg)", "判定重(計)", "操作"};
        tableModel = new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int r, int c) { return c != 0 && c != 6 && c != 8; }
        };
        table = new JTable(tableModel);
        table.setRowHeight(25);
        add(new JScrollPane(table), BorderLayout.CENTER);

        // --- 下部パネル（結果表示） ---
        JPanel bottomPanel = new JPanel(new BorderLayout());
        
        totalWeightLabel = new JLabel("合計判定重量: 0.0 kg  ", SwingConstants.RIGHT);
        totalWeightLabel.setFont(new Font("Meiryo", Font.BOLD, 16));
        totalWeightLabel.setForeground(new Color(180, 100, 0));

        JPanel resGrid = new JPanel(new GridLayout(1, 3, 10, 10));
        resGrid.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        resSagawa = createResultCard("佐川急便");
        resYamato = createResultCard("ヤマト運輸");
        resKintetsu = createResultCard("近鉄ロジスティクス");
        
        resGrid.add(resSagawa); resGrid.add(resYamato); resGrid.add(resKintetsu);

        JButton btnCalc = new JButton("運賃計算を実行");
        btnCalc.setFont(new Font("Meiryo", Font.BOLD, 18));
        btnCalc.setBackground(new Color(45, 52, 54));
        btnCalc.setForeground(Color.WHITE);
        btnCalc.addActionListener(e -> calculate());

        bottomPanel.add(totalWeightLabel, BorderLayout.NORTH);
        bottomPanel.add(resGrid, BorderLayout.CENTER);
        bottomPanel.add(btnCalc, BorderLayout.SOUTH);
        
        add(bottomPanel, BorderLayout.SOUTH);
        
        // テーブル更新イベント
        tableModel.addTableModelListener(e -> updateWeights());
    }

    private JLabel createResultCard(String title) {
        JLabel label = new JLabel("<html><center>" + title + "<br><font size='6' color='red'>- 円</font></center></html>", SwingConstants.CENTER);
        label.setBorder(BorderFactory.createLineBorder(Color.GRAY));
        label.setOpaque(true);
        label.setBackground(Color.WHITE);
        return label;
    }

    private void addNewRow() {
        tableModel.addRow(new Object[]{tableModel.getRowCount() + 1, modelInput.getText(), 1, 0, 0, 0, 0, 0.0, 0.0, "削除"});
        modelInput.setText("");
    }

    private void updateWeights() {
        double grandTotalWeight = 0;
        for (int i = 0; i < tableModel.getRowCount(); i++) {
            try {
                int qty = Integer.parseInt(tableModel.getValueAt(i, 2).toString());
                double l = Double.parseDouble(tableModel.getValueAt(i, 3).toString());
                double w = Double.parseDouble(tableModel.getValueAt(i, 4).toString());
                double h = Double.parseDouble(tableModel.getValueAt(i, 5).toString());
                double weight = Double.parseDouble(tableModel.getValueAt(i, 7).toString());

                double sum3 = l + w + h;
                double volWeight = ((l / 10.0) * (w / 10.0) * (h / 10.0)) / 6000.0;
                double judge = Math.max(weight, volWeight) * qty;

                tableModel.setValueAt((int)sum3, i, 6);
                tableModel.setValueAt(String.format("%.1f", judge), i, 8);
                grandTotalWeight += judge;
            } catch (Exception e) {}
        }
        totalWeightLabel.setText("合計判定重量: " + String.format("%.1f", grandTotalWeight) + " kg  ");
    }

    private void calculate() {
        String pref = (String) prefCombo.getSelectedItem();
        String areaS = prefToArea.get(pref); // 佐川用（北九州・南九州含む）
        String areaK = (areaS.equals("北九州") || areaS.equals("南九州")) ? "九州" : areaS; // 他用

        double sSum = 0, ySum = 0, totalW = 0;
        boolean sOver = false, yOver = false;

        for (int i = 0; i < tableModel.getRowCount(); i++) {
            int qty = Integer.parseInt(tableModel.getValueAt(i, 2).toString());
            int mm = (int) tableModel.getValueAt(i, 6);
            double judgeRow = Double.parseDouble(tableModel.getValueAt(i, 8).toString());
            totalW += judgeRow;

            if (mm > 2600) sOver = true;
            if (mm > 2000) yOver = true;
            
            // 本来はここに詳細な運賃マスタ（Map）を参照する処理が入ります
            // デモ用に簡易加算
            sSum += 1000 * qty; 
            ySum += 1200 * qty;
        }

        // --- 佐川表示（沖縄判定） ---
        if (pref.equals("沖縄県")) {
            resSagawa.setText("<html><center>佐川急便<br><font color='gray' size='5'>別途別料金</font></center></html>");
        } else if (sOver) {
            resSagawa.setText("<html><center>佐川急便<br><font color='gray' size='5'>サイズ外</font></center></html>");
        } else {
            resSagawa.setText("<html><center>佐川急便<br><font color='red' size='6'>計算済</font></center></html>");
        }

        // --- 近ロジ表示 ---
        double cFee = Double.parseDouble(charterField.getText());
        double aFee = Double.parseDouble(assistField.getText());
        resKintetsu.setText("<html><center>近鉄ロジ<br><font color='red' size='6'>" + String.format("%,.0f", (cFee + aFee)) + "円〜</font></center></html>");
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new FreightSimulator().setVisible(true));
    }
}