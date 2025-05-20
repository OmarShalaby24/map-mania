// import * as countries from './Countries.json';
// console.log(countries[0]);

import { CountryClass } from './types';

// const countries = require('./countries_data_2.json');

export const makeQuestion = async (
  numberOfChoices: number,
  countries: any[]
) => {
  let options = [...countries];
  let count = countries.length;

  const answer: CountryClass = options[Math.floor(Math.random() * count)];
  count--;
  options = options.filter((c) => c.code !== answer.code);

  let choices: CountryClass[] = [answer];
  for (let i = 0; i < numberOfChoices - 1; i++) {
    let pickedCountry = options[Math.floor(Math.random() * count)];
    let choice = pickedCountry;
    count--;
    options = options.filter((c) => c.code !== pickedCountry.code);
    choices = [...choices, choice];
  }
  let randomPositionForAnswer = Math.floor(Math.random() * 3);
  [choices[0], choices[randomPositionForAnswer]] = [
    choices[randomPositionForAnswer],
    choices[0],
  ];
  return { answer, choices };
};

export const makeQuiz = async (
  numberOfChoices: number,
  numberOfQuestions: number,
  countries: CountryClass[] | []
) => {
  let answers: CountryClass[] = [];
  let options: CountryClass[][] = [];

  let quiz: {
    answer: CountryClass;
    options: CountryClass[];
  }[] = [];

  let answersCodes: string[] = [];

  for (let i = 0; i < numberOfQuestions; i++) {
    const { answer, choices } = await makeQuestion(numberOfChoices, countries);
    if (answersCodes.includes(answer.code)) {
      i--;
      continue;
    }
    quiz = [
      ...quiz,
      {
        answer,
        options: choices,
      },
    ];
    answersCodes.push(answer.code);
  }
  return quiz;
};
