import { ScrollView, View, Text, StyleSheet } from 'react-native';

const DOMAINS = [
  {
    name: 'Memory',
    color: '#c4805a',
    summary: 'Encoding, storage, and retrieval',
    detail:
      'Working memory (holding information in mind while using it) and episodic memory (remembering events) are among the first capacities to show age-related change. Word list recall, story retelling, and n-back tasks directly target these systems.',
  },
  {
    name: 'Attention',
    color: '#7a9e7a',
    summary: 'Focus and selective processing',
    detail:
      'The ability to concentrate on relevant stimuli, filter distractions, and sustain mental effort over time. Digit span, letter search, and rapid categorization exercises challenge selective and sustained attention.',
  },
  {
    name: 'Processing Speed',
    color: '#c8a84a',
    summary: 'How quickly the brain acts',
    detail:
      'The rate at which your brain executes cognitive operations. Processing speed predicts performance across nearly every other domain and declines naturally with age. Stroop variants and rapid categorization tasks train this capacity.',
  },
  {
    name: 'Executive Function',
    color: '#b8845a',
    summary: 'Planning, switching, and control',
    detail:
      "The brain's control center: planning ahead, switching flexibly between tasks, and suppressing irrelevant responses. Centered in the prefrontal cortex, these capacities are critical for complex goal-directed behavior. Tower tasks, category switching, and verbal inhibition exercises target them.",
  },
  {
    name: 'Language',
    color: '#6a9eae',
    summary: 'Verbal fluency and comprehension',
    detail:
      'The ability to retrieve words quickly, understand complex sentences, and complete linguistic patterns. Language fluency is both a training target and a sensitive early indicator of cognitive health. Category fluency, letter fluency, and sentence completion tasks exercise this domain.',
  },
  {
    name: 'Visuospatial',
    color: '#a87060',
    summary: 'Spatial reasoning through language',
    detail:
      'Spatial reasoning approached verbally: describing patterns, following multi-step directions, and mentally rotating shapes through language. These tasks engage parietal and temporal networks critical for navigation and object recognition.',
  },
];

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionRule} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function DomainCard({ name, color, summary, detail }: typeof DOMAINS[0]) {
  return (
    <View style={styles.domainCard}>
      <View style={[styles.domainAccent, { backgroundColor: color }]} />
      <View style={styles.domainContent}>
        <Text style={styles.domainName}>{name}</Text>
        <Text style={[styles.domainSummary, { color }]}>{summary}</Text>
        <Text style={styles.domainDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Mission */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Preventia</Text>
        <Text style={styles.heroSubtitle}>
          Verbal cognitive training built on the science of cognitive reserve.
        </Text>
      </View>

      <SectionHeader title="Why This Matters" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>The Cognitive Reserve Hypothesis</Text>
        <Text style={styles.cardText}>
          The brain has a remarkable capacity to withstand damage before symptoms emerge — a property
          researchers call <Text style={styles.em}>cognitive reserve</Text>. Pioneered by neurologist
          Yaakov Stern, this theory holds that engaging in mentally stimulating activities throughout
          life builds reserve that delays the onset of age-related cognitive decline, potentially by
          years.
        </Text>
        <Text style={styles.cardText}>
          Preventia is designed around this insight. Daily, varied cognitive challenges — delivered
          through conversation and structured exercises — are how you build that reserve.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why Verbal Training?</Text>
        <Text style={styles.cardText}>
          Verbal cognitive training activates overlapping networks across multiple brain domains
          simultaneously. Engaging with language, memory, and reasoning together — as you do in
          conversation — is a particularly efficient training modality, and one that maps naturally
          onto real-world cognitive demands.
        </Text>
        <Text style={styles.cardText}>
          Meta-analyses of computerized cognitive training programs (Lampit et al., 2014) show
          modest but measurable benefits on cognitive function in healthy older adults. Preventia
          applies these findings in a more engaging, conversational format.
        </Text>
      </View>

      <SectionHeader title="How Preventia Works" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Two Training Modes</Text>
        <Text style={styles.cardText}>
          <Text style={styles.em}>Train</Text> — Pierre, your AI cognitive coach, weaves cognitive
          exercises naturally into conversation. The goal is stimulating, varied mental engagement
          that feels less like a clinical test and more like a challenging, rewarding exchange.
        </Text>
        <Text style={[styles.cardText, { marginTop: 8 }]}>
          <Text style={styles.em}>Solo</Text> — Structured standalone exercises for focused,
          self-directed practice across any of the six cognitive domains. Your responses are scored
          by AI using a clinical-grade rubric for each exercise type.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Adaptive and Tracked</Text>
        <Text style={styles.cardText}>
          Every response is scored and logged. Your History screen shows performance across
          domains so you can see where you are strongest and where to focus. Future versions will
          adapt exercise selection based on your longitudinal performance profile.
        </Text>
      </View>

      <SectionHeader title="The Six Cognitive Domains" />

      {DOMAINS.map(d => <DomainCard key={d.name} {...d} />)}

      <SectionHeader title="The Research" />

      <View style={styles.card}>
        {[
          'Stern, Y. (2002). What is cognitive reserve? Theory and research application of the reserve concept. Journal of the International Neuropsychological Society, 8(3), 448–460.',
          'Lampit, A., Hallock, H., & Valenzuela, M. (2014). Computerized cognitive training in cognitively healthy older adults: A systematic review and meta-analysis. PLOS Medicine, 11(11).',
          'Park, D. C., & Bischof, G. N. (2013). The aging mind: neuroplasticity in response to cognitive training. Dialogues in Clinical Neuroscience, 15(1), 109–119.',
          'Livingston, G. et al. (2020). Dementia prevention, intervention, and care: 2020 report of the Lancet Commission. The Lancet, 396(10248), 413–446.',
        ].map((ref, i) => (
          <View key={i} style={[styles.reference, i > 0 && { marginTop: 12 }]}>
            <Text style={styles.refNumber}>{i + 1}</Text>
            <Text style={styles.refText}>{ref}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Preventia is not a medical device and does not diagnose, treat, or prevent any condition.
          Consult a qualified healthcare professional for medical advice.
        </Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#16140f' },
  content: { padding: 20, paddingBottom: 48 },

  hero: { alignItems: 'center', paddingVertical: 28 },
  heroTitle: { color: '#ede5d0', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtitle: {
    color: '#9a9080', fontSize: 15, textAlign: 'center', marginTop: 8,
    lineHeight: 22, maxWidth: 280,
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10,
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: '#2e2b20' },
  sectionTitle: {
    color: '#c4805a', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  card: {
    backgroundColor: '#252219', borderRadius: 14, padding: 18, marginBottom: 12,
  },
  cardTitle: { color: '#ede5d0', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  cardText: { color: '#a8a090', fontSize: 14, lineHeight: 22 },
  em: { color: '#ede5d0', fontWeight: '600' },

  domainCard: {
    backgroundColor: '#252219', borderRadius: 14, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
  },
  domainAccent: { width: 4 },
  domainContent: { flex: 1, padding: 16 },
  domainName: { color: '#ede5d0', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  domainSummary: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  domainDetail: { color: '#9a9080', fontSize: 13, lineHeight: 20 },

  reference: { flexDirection: 'row', gap: 10 },
  refNumber: {
    color: '#c4805a', fontSize: 12, fontWeight: '700', minWidth: 16, marginTop: 1,
  },
  refText: { flex: 1, color: '#7a7060', fontSize: 12, lineHeight: 18 },

  footer: { marginTop: 24, paddingHorizontal: 4 },
  footerText: { color: '#5c5548', fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
