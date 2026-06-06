import type { WritingTopic } from "./types";

export const cet4WritingTopics: WritingTopic[] = [
  {
    id: "w4-1",
    title: "Should university students be required to take physical exercise classes?",
    type: "opinion",
    difficulty: "medium",
    focus: "立场表达与因果论证",
  },
  {
    id: "w4-2",
    title: "Describe a positive change you have made in your study habits and how it affected your academic performance.",
    type: "phenomenon",
    difficulty: "easy",
    focus: "叙事逻辑与细节支撑",
  },
  {
    id: "w4-3",
    title: "Write a letter to your university library suggesting improvements to its study spaces.",
    type: "letter",
    difficulty: "medium",
    focus: "书信格式与建议类表达",
  },
];

export const cet6WritingTopics: WritingTopic[] = [
  {
    id: "w6-1",
    title: "To what extent should artificial intelligence play a role in higher education assessment?",
    type: "opinion",
    difficulty: "hard",
    focus: "批判性思维与让步论证",
  },
  {
    id: "w6-2",
    title: "Some argue that remote work erodes company culture. Discuss both views and give your own opinion.",
    type: "opinion",
    difficulty: "medium",
    focus: "双边讨论与立场平衡",
  },
  {
    id: "w6-3",
    title: "Write a proposal for a campus sustainability initiative that addresses both environmental and educational goals.",
    type: "solution",
    difficulty: "hard",
    focus: "方案设计与多维度论证",
  },
];

export const cet4TranslationPassages = [
  "近年来，越来越多的中国大学生选择在假期参加志愿者活动。他们前往农村地区支教，或者参与社区服务项目。这些经历不仅帮助他们更好地了解社会，也培养了他们的责任感和团队合作能力。",
  "移动支付已经深刻改变了中国人的日常生活。无论是在大型商场还是街边小摊，人们都可以使用手机完成支付。这种支付方式快捷方便，但也带来了一些关于个人信息安全的担忧。",
];

export const cet6TranslationPassages = [
  "中国的城市化进程在过去四十年间经历了前所未有的快速发展。这一进程不仅重塑了中国的经济地理格局，也深刻影响了数亿人的生活方式。然而，如何在城市扩展与生态保护之间找到平衡，仍然是一个需要持续探索的课题。",
  "非物质文化遗产的保护日益受到国际社会的重视。对于中国而言，如何在现代化浪潮中传承和发展传统手工艺，既是一个文化命题，也是一个经济命题。越来越多的年轻设计师正在尝试将传统元素融入当代设计，为古老技艺注入新的活力。",
];

export const initialMessage = {
  cet4: `你选择的是 **CET-4** 级别。下面是你当前的练习界面。

写作字数建议：120–180 词。题目偏重校园生活、学习方法、日常生活和简单的社会观察。`,
  cet6: `你选择的是 **CET-6** 级别。下面是你当前的练习界面。

写作字数建议：150–220 词。题目偏重科技与社会、教育、职业发展、文化沟通、可持续发展等抽象议题。`,
};
