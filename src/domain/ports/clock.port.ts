/**
 * Toda leitura de tempo no dominio e na aplicacao passa por aqui.
 * Sem isso nao ha como testar o SRS com datas simuladas (regra do CLAUDE.md).
 */
export interface ClockPort {
  now(): Date;
  /** Dia local do aluno no formato YYYY-MM-DD. */
  today(): string;
}
