import { create } from 'zustand';

interface Article {
  id: string;
  title: string;
  author: string;
  year: number;
  content: string; // Simplified for this example, could be URL to PDF/EPUB
  abstract: string;
}

interface AppState {
  articles: Article[];
  selectedArticleId: string | null;
  selectArticle: (id: string) => void;
  searchText: string;
  setSearchText: (text: string) => void;
}

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'The Quantum Realm: A Unified Field Theory',
    author: 'Dr. Alistair Finch',
    year: 2022,
    abstract: 'This paper explores novel approaches to unifying quantum mechanics with general relativity, proposing a new framework for understanding the fundamental forces of the universe.',
    content: `
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Introduction to Quantum Unification</h2>
        <p class="mb-4 leading-relaxed">The quest for a unified field theory has captivated physicists for decades. Bridging the gap between the microscopic world governed by quantum mechanics and the macroscopic realm described by general relativity remains one of the most significant challenges in theoretical physics. This paper delves into the historical context, current dilemmas, and proposes a novel conceptual framework for achieving this elusive unification.</p>
        <p class="mb-4 leading-relaxed">Traditional attempts, such as String Theory and Loop Quantum Gravity, have offered profound insights but have yet to yield a fully consistent and experimentally verifiable model. Our approach re-examines the role of spacetime quantization and proposes an emergent gravity model, where gravitational effects arise from the collective behavior of quantum entanglement at a foundational level.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Theoretical Framework</h2>
        <p class="mb-4 leading-relaxed">Our theoretical framework posits a pre-geometric substratum from which both spacetime and matter fields emerge. This substratum is characterized by a network of entangled quantum bits (qubits) that form dynamic, interconnected structures. The geometry of spacetime, in this model, is not fundamental but rather an effective description of the collective excitation patterns within this quantum network.</p>
        <p class="mb-4 leading-relaxed">A key innovation is the concept of 'entanglement entropy' acting as a gravitational potential. Regions of higher entanglement density would manifest as stronger gravitational fields, providing a quantum mechanical origin for gravitational phenomena. This allows for a reinterpretation of black hole thermodynamics and cosmology.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Implications and Future Directions</h2>
        <p class="mb-4 leading-relaxed">The implications of such a unified theory are far-reaching, potentially offering new insights into the nature of dark matter and dark energy. Furthermore, it suggests new avenues for experimental verification, particularly in precision measurements of gravitational waves and the properties of exotic matter under extreme conditions.</p>
        <p class="mb-4 leading-relaxed">Future work will involve developing a more rigorous mathematical formalism for this emergent gravity model and exploring its predictions in the context of early universe cosmology. We anticipate that this framework will open up new dialogues between quantum information theory and fundamental physics.</p>
      </section>
    `,
  },
  {
    id: '2',
    title: 'Advanced AI Architectures for Biomedical Data Analysis',
    author: 'Dr. Evelyn Reed',
    year: 2023,
    abstract: 'This paper presents novel deep learning architectures specifically designed for the complex and high-dimensional nature of biomedical datasets, improving diagnostic accuracy and drug discovery.',
    content: `
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Introduction to AI in Biomedicine</h2>
        <p class="mb-4 leading-relaxed">The explosion of biomedical data—from genomic sequences to medical imaging—presents both unprecedented opportunities and significant challenges for data analysis. Traditional statistical methods often struggle with the sheer volume and complexity of these datasets. Artificial intelligence, particularly deep learning, offers powerful tools to extract meaningful insights, accelerate research, and improve patient outcomes.</p>
        <p class="mb-4 leading-relaxed">This paper introduces several novel AI architectures tailored to overcome common hurdles in biomedical data processing, such as data sparsity, imbalance, and the need for explainability. We focus on enhancing diagnostic accuracy in imaging and accelerating the drug discovery pipeline through predictive modeling.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Novel Architectures and Methods</h2>
        <p class="mb-4 leading-relaxed">We propose a hybrid convolutional-recurrent neural network (CRNN) for time-series physiological data, capable of capturing both spatial features and temporal dependencies. For high-resolution medical images, a modified U-Net architecture incorporating attention mechanisms significantly improves lesion segmentation accuracy.</p>
        <p class="mb-4 leading-relaxed">Furthermore, a graph neural network (GNN) is developed for analyzing protein-protein interaction networks and drug-target prediction. This GNN leverages the topological structure of molecular data to infer complex relationships that are often missed by conventional methods, leading to more efficient candidate screening for new therapeutics.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Results and Future Work</h2>
        <p class="mb-4 leading-relaxed">Our experimental results demonstrate superior performance across various benchmarks, including a 15% increase in diagnostic accuracy for specific cancer types from MRI scans and a 20% reduction in false positives for drug candidate screening. The explainability features integrated into our models provide clinicians and researchers with crucial insights into the decision-making process.</p>
        <p class="mb-4 leading-relaxed">Future directions include deploying these architectures in clinical trials, integrating multi-modal biomedical data streams, and exploring federated learning approaches to enhance data privacy and collaboration across institutions.</p>
      </section>
    `,
  },
  {
    id: '3',
    title: 'The Socio-Economic Impact of Renewable Energy Policies in Developing Nations',
    author: 'Prof. Marcus Thorne',
    year: 2021,
    abstract: 'An in-depth analysis of how renewable energy policies affect economic growth, social equity, and environmental sustainability in emerging economies.',
    content: `
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Introduction: Renewables and Development</h2>
        <p class="mb-4 leading-relaxed">The transition to renewable energy sources is a global imperative, particularly for developing nations facing the dual challenges of energy access and climate change. This paper investigates the multi-faceted socio-economic impacts of various renewable energy policies implemented in a selection of emerging economies, focusing on their effectiveness in fostering sustainable development.</p>
        <p class="mb-4 leading-relaxed">While the environmental benefits of renewables are well-established, their socio-economic implications—including job creation, energy affordability, and community empowerment—are complex and context-dependent. Our research aims to provide a nuanced understanding of these dynamics, highlighting both successes and areas for improvement.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Methodology and Case Studies</h2>
        <p class="mb-4 leading-relaxed">Utilizing a mixed-methods approach, this study combines quantitative econometric analysis of energy investment and economic growth data with qualitative case studies of policy implementation in three distinct developing nations. We examine policies such as feed-in tariffs, renewable energy mandates, and international aid programs.</p>
        <p class="mb-4 leading-relaxed">Key metrics include GDP growth, poverty reduction, access to electricity in rural areas, and local employment generation in the renewable sector. Furthermore, we analyze public perception and stakeholder engagement through interviews with policymakers, industry leaders, and local communities.</p>
      </section>
      <section>
        <h2 class="text-2xl font-serif font-bold mb-4 text-primary-700">Findings and Policy Recommendations</h2>
        <p class="mb-4 leading-relaxed">Our findings reveal a strong correlation between stable, long-term renewable energy policies and sustained economic growth, particularly when policies are coupled with local content requirements and capacity-building initiatives. However, initial capital costs and grid integration challenges remain significant barriers.</p>
        <p class="mb-4 leading-relaxed">We recommend that developing nations prioritize policies that foster local ownership and participation, integrate renewable energy planning with broader national development strategies, and leverage international partnerships for technology transfer and financial support. These measures are crucial for ensuring an equitable and sustainable energy transition.</p>
      </section>
    `,
  },
];

export const useStore = create<AppState>((set) => ({
  articles: mockArticles,
  selectedArticleId: mockArticles[0].id, // Select first article by default
  selectArticle: (id) => set({ selectedArticleId: id }),
  searchText: '',
  setSearchText: (text) => set({ searchText: text }),
}));