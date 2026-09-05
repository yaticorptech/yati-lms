import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award } from 'lucide-react';
import YatiLoader from '../../../components/YatiLoader';
import useMinimumLoading from '../../../hooks/useMinimumLoading';

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { data } = await api.get('/achievements');
        setAchievements(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const showLoader = useMinimumLoading(loading);
  if (showLoader) return <YatiLoader label="Loading your achievements" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink-900">Achievements</h1>
        <p className="text-ink-500">Badges and milestones you've unlocked.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.length === 0 ? (
          <div className="col-span-full p-6 sm:p-8 bg-surface rounded-xl shadow-sm text-center text-ink-500">
            Keep completing tasks to unlock achievements!
          </div>
        ) : (
          achievements.map((ach) => (
            <div key={ach._id} className="bg-surface-50 p-6 rounded-xl shadow-sm border border-yellow-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <Award className="text-yellow-600 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-ink-900 mb-2">{ach.title}</h3>
              <p className="text-sm text-ink-600 mb-4">{ach.description}</p>
              <span className="text-xs text-ink-400 font-medium">
                Unlocked: {new Date(ach.unlockedAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
