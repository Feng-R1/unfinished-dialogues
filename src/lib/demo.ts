import { byId } from "./philosophers";

export function needsImmediateSupport(text: string): boolean {
  return /想自杀|准备自杀|打算自杀|想结束生命|不想活了|想死|想伤害自己|准备跳楼|准备割腕|我要自杀/.test(text);
}
export const supportText = "你现在的安全比继续讨论哲学更重要。如果你已经受伤、服用了过量药物，或可能马上伤害自己，请立即拨打 120 或 110，或让身边的人陪你去最近的急诊。\n\n请先离开可能伤害自己的物品或地点，联系一个你信任的人，直接告诉对方：“我现在不太安全，请陪着我。”在中国大陆，也可以尝试拨打心理援助热线 12356；如未接通，请继续联系现实中的支持。\n\n你现在是一个人吗？身边有没有能立即陪着你的人？";

export function demoReply(id: string, question: string, messages: { role: string; content: string }[], opening: boolean): string {
  const person = byId[id];
  const latest = [...messages].reverse().find(m => m.role === "user")?.content ?? question;
  if (needsImmediateSupport(latest)) return supportText;
  if (opening) return `${person.opening.title}\n\n${person.opening.body}\n\n${person.opening.question}`;
  if (/出处|原话|哪本|引用|依据/.test(latest)) return `可以从${person.sources.map(s => s.title).join("、")}开始了解。\n\n${person.sources[0].detail}\n\n这里的对话是现代情境下的思想演绎，不是历史人物原话。你可以打开“思想依据”查看资料入口。演示模式只呈现预写示例，无法核实你另外提出的引文。`;
  if (/不认同|不同意|反对|不一定|不对|但是|可是/.test(latest)) return `你的反对值得留下。任何一种思想都不应该抹去你正在经历的具体处境。\n\n以${person.name}的视角来看，${person.lens}只是重新审视问题的一个入口，它未必能独自解释全部情况。我们需要检验它在哪些条件下有帮助，又在哪些地方遗漏了你的需要。\n\n如果用一个具体经历来说明，你觉得这个观点最不适用的地方是什么？`;
  const examples: Record<string, string> = {
    zhuangzi: "拿一张纸，把“我真正想要的”和“我觉得自己应该想要的”分开写。它们可能重叠，也可能不同。先不急着删去任何一项，只看清每一个期待从哪里来。",
    socrates: "把最让你难受的一句话写下来，例如“选错一次，我就失败了”。然后各找一个支持它的理由和一个反例。看看需要被修正的是行动，还是这句话的绝对程度。",
    epictetus: "把担心分成两列：“我能选择的行动”和“我不能保证的结果”。从第一列挑一件今天能做的小事；第二列可以准备应对，但不必要求自己保证它不会发生。",
    confucius: "回想一个你珍视的人：你希望怎样对待他，也希望怎样被对待？挑一件可以认真履行的小事，从一段具体关系里观察自己的价值选择。",
    wang: "选择一个你已经认可的小目标，缩小到能实际完成的程度。做过之后记录：哪里与预想不同？这会帮助你分清自己是真正认同，还是只认同一个好听的说法。",
    aristotle: "分别写下两个选项下，一个普通工作日会怎样度过。比较的不只是回报，还包括习惯、朋友、能力的成长与外在条件。好的判断需要这些细节。",
    nietzsche: "写下一个你反复使用的“应该”，再问它的来源。它是在回应你珍视的生活，还是主要在回避羞耻与他人的否定？现在先观察，不急着用另一个口号替代它。",
    camus: "今天先找一件不需要终极证明、却仍值得认真做的事：为自己准备一顿饭，联系一个人，完成一点创作。观察你在行动中的感受，而不是要求它马上回答人生。",
    beauvoir: "把选项所需的时间、金钱、支持与风险列出来。找一个能稍微增加选择余地的条件，例如一项信息、一次试做或一个支持者。自由可以从真实条件的改变开始。",
    nagarjuna: "把“我就是这样的人”改写成“在这些条件下，我经历了这件事”。列出影响结果的几个条件，再看看其中一个发生变化时，你的判断是否也需要变化。",
  };
  return `可以先把思考放进一个小范围的尝试里。\n\n${examples[id]}\n\n你愿意从哪一小部分开始？也可以告诉我，这个例子和你的处境哪里不相符。`;
}
