export type RootStackParamList = {
  WelcomeScreen: undefined;
  MainMenuScreen: {countries: CountryClass[]};
  QuizScreen: {quiz: QuestionClass[]};
  ResultsScreen: {
    correctAnswersBadge: number;
    questionCounterBadge: number;
    timeCountDownBadge: number;
    results: ResultRecord[];
  };
  FlagsScreen: {countries: CountryClass[]};
  AboutScreen: undefined;
};

// export type MainMenuParamList = {
//   // QuizScreen: {numberOfQuestions: number};
// };

export type CountryClass = {
  name: string;
  code: string;
  flag: string;
};
export type QuestionClass = {
  answer: CountryClass;
  options: CountryClass[];
};
export type QuizClass = {
  questions: QuestionClass[];
};

export type ResultRecord = {
  answer: CountryClass;
  pickedOption: CountryClass;
};
